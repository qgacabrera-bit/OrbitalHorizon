from flask import Flask, request, jsonify, render_template, send_file
from flask_cors import CORS
import pandas as pd, requests
import numpy as np
import io, base64, joblib
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix, roc_auc_score, roc_curve
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier, log_evaluation, early_stopping

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Temporary storage for last uploaded data
global global_features
global global_target
global global_df_core
global global_df_unscaled
global global_predictions
global global_trained_model

global_features = None
global_target = None
global_df_core = None
global_df_unscaled = None
global_predictions = None
global_trained_model = None

def extract_features_and_target(df, feature_keywords, target_keywords):
    # Filter features to only those present in df
    feature_cols = [col for col in feature_keywords if col in df.columns]

    # Detect target column
    target_col = next((col for col in target_keywords if col in df.columns), None)
    if target_col is None:
        raise ValueError("No valid target column found in this dataset.")

    # Subset dataframe
    df_core = df[feature_cols + [target_col]].copy()

    return df_core, feature_cols, target_col

def detect_header(raw_data, target_keywords, max_skip=300):
    df = None
    header_line = None

    for skip in range(max_skip):
        try:
            candidate = pd.read_csv(io.StringIO(raw_data), skiprows=skip, nrows=5)
            if any(col.lower() in [t.lower() for t in target_keywords] for col in candidate.columns):
                df = pd.read_csv(io.StringIO(raw_data), skiprows=skip)
                header_line = skip
                break
        except Exception:
            continue

    if df is None:
        return None, None, "Could not detect valid dataset header"

    return df, header_line, None

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/upload", methods=["POST"])
def upload_csv():
    global global_features, global_target, global_df_core, global_df_unscaled, global_predictions, global_trained_model

    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    try:
        raw_data = file.read().decode("utf-8", errors="ignore")

        # Possible target column names
        target_keywords = ["koi_disposition", "tfopwg_disp", "disposition"]

        # Possible identifier column names
        id_keywords = ["kepoi_name", "pl_name", "kepid", "tic_id"]

        df, header_line, error = detect_header(raw_data, target_keywords)
        if error:
            return jsonify({"error": error}), 400

        # DEBUG: print available columns
        print("🔍 Available columns:", list(df.columns))

        # Define search keywords for important features
        feature_keywords = [
            # kepler features
            'koi_prad', 'koi_period', 'koi_depth', 'koi_duration',
            'koi_teq', 'koi_insol',
            'koi_steff', 'koi_srad','ra', 'dec',

            # k2/tess features
            'pl_rade', 'pl_orbper', 'pl_trandep', 'pl_trandur', 'pl_trandurh',
            'pl_eqt', 'pl_insol',
            'st_teff', 'st_rad'
        ]

        feature_keywords = list(dict.fromkeys(feature_keywords))

        # Encode target labels uniformly
        target_map = {
            # NOT A PLANET
            'FALSE POSITIVE': 0, 'REFUTED': 0, 'FP': 0, 'FA': 0,
            # CANDIDATE
            'CANDIDATE': 1, 'PC': 1, 'CP': 1, 'APC': 1,
            # PLANET
            'CONFIRMED': 2, 'KP': 2
        }
        
        # Find the first available ID column
        id_col = next((col for col in id_keywords if col in df.columns), None)

        # Extract features and target
        df_core, feature_cols, target_col = extract_features_and_target(df, feature_keywords, target_keywords)

        # Rename features for uniformity
        rename_map = {
            'koi_prad':'pl_rade', 'koi_period':'pl_orbper', 'koi_depth':'pl_trandep', 'koi_duration':'pl_trandur',
            'koi_teq':'pl_eqt', 'koi_insol':'pl_insol', 'koi_steff':'st_teff', 'koi_srad':'st_rad',
            'koi_score':'score', 'koi_model_snr':'snr', 'pl_trandurh':'pl_trandur', 'st_tmag':'st_mag'
        }
        rename_map = {k: v for k, v in rename_map.items() if k in df_core.columns}
        df_core.rename(columns=rename_map, inplace=True)

        if id_col:
            df_core[id_col] = df[id_col]

        df_core['target'] = df_core[target_col].map(target_map)
        df_core = df_core[df_core['target'].notna()]
        df_core = df_core.drop(columns=[target_col])
        df_core['target'] = df_core['target'].astype(int)

        numeric_cols = df_core.select_dtypes(include=np.number).columns.drop('target', errors='ignore')
        for col in numeric_cols:
            df_core[col] = df_core[col].fillna(df_core[col].median())

        # Store the unscaled data AFTER filling NaNs but BEFORE any scaling/log transforms
        global_df_unscaled = df_core.copy()

        feature_cols = list(df_core.columns.drop('target'))
        df_core[feature_cols] = df_core[feature_cols]

        canonical_order = [
            'pl_rade', 'pl_orbper', 'pl_trandep', 'pl_trandur', 'pl_eqt', 'pl_insol',
            'st_teff', 'st_rad','ra', 'dec'
        ]
        final_cols = [col for col in canonical_order if col in df_core.columns]
        final_cols.append('target')
        if id_col: final_cols.append(id_col)
        df_core = df_core[final_cols]

        extracted_raw = df_core[feature_cols].head(5).to_dict(orient="records") if len(feature_cols) > 0 else []
        extracted_normalized = df_core[feature_cols].head(5).to_dict(orient="records") if len(feature_cols) > 0 else []
        targets_raw = df_core['target'].head(5).tolist()
        targets_numeric = df_core['target'].head(5).tolist()
        missing_counts = df_core.isnull().sum().to_dict()
        temp_cols = [c for c in feature_cols if 'teff' in c.lower()]
        rad_cols = [c for c in feature_cols if 'rad' in c.lower()]

        global_features = [col for col in df_core.columns if col not in ['target', id_col]]
        global_target = 'target'
        global_df_core = df_core.copy()

        global_predictions = None
        global_trained_model = None

        return jsonify({
            "header_line": header_line, "target_column": target_col, "missing_counts": missing_counts,
            "temperature_columns": temp_cols, "radius_columns": rad_cols, "extracted_raw": extracted_raw,
            "extracted_normalized": extracted_normalized, "targets_raw": targets_raw, "targets_numeric": targets_numeric
        })

    except Exception as e:
        # Log the full error to the console for debugging
        print(f"❌ An error occurred during upload: {e}")
        # Return a user-friendly JSON error message
        return jsonify({"error": f"An error occurred during processing: {str(e)}"}), 500

@app.route("/save", methods=["GET"])
def save_processed_data():
    global global_df_core
    if global_df_core is None:
        return jsonify({"error": "No dataset uploaded yet."}), 400

    # Save DataFrame to a BytesIO buffer
    buf = io.BytesIO()
    global_df_core.to_csv(buf, index=False)
    buf.seek(0)
    
    return send_file(
        buf,
        mimetype="text/csv",
        as_attachment=True,
        download_name="processed_data.csv"
    )

@app.route("/train", methods=["POST"])
def train_model():
    global global_df_core, global_trained_model
    if global_df_core is None:
        return jsonify({"error": "No dataset uploaded yet."}), 400

    data = request.json
    model_choice = data.get("model")
    hyperparams = data.get("hyperparams", {})

    X = global_df_core[global_features] # Use the curated feature list
    y = global_df_core['target']

    if model_choice not in ["xgb", "lgbm"]:
        return jsonify({"error": "Invalid model choice."}), 400

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    num_classes = len(np.unique(y_train))

    evals_result = {}  # to store training history

    # ------------------------- XGBoost -------------------------
    if model_choice == "xgb":
        n_estimators = hyperparams.get("n_estimators", 100)
        max_depth = hyperparams.get("max_depth", 3)
        learning_rate = hyperparams.get("learning_rate", 0.1)

        if num_classes > 2:
            objective = "multi:softprob"
        else:
            objective = "binary:logistic"

        model = XGBClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            learning_rate=learning_rate,
            objective=objective,
            num_class=num_classes if num_classes > 2 else None,
            random_state=42
        )

        model.fit(
            X_train, y_train,
            eval_set=[(X_train, y_train), (X_test, y_test)],
            verbose=False
        )
        evals_result = model.evals_result()

    # ------------------------- LightGBM -------------------------
    elif model_choice == "lgbm":
        model = LGBMClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=-1,
            random_state=42
        )

        # choose metric depending on problem type
        if num_classes > 2:
            metrics = ["multi_logloss", "multi_error"]
        else:
            metrics = ["binary_logloss", "binary_error"]

        model.fit(
            X_train, y_train,
            eval_set=[(X_train, y_train), (X_test, y_test)],
            eval_metric=metrics,
            callbacks=[
                log_evaluation(period=10),
                early_stopping(stopping_rounds=20),
            ]
        )

        # LightGBM stores in model.evals_result_
        raw_result = model.evals_result_

        # 🔄 Normalize to match XGBoost style
        for dataset_name, metrics_dict in raw_result.items():
            evals_result[dataset_name] = {}
            for metric_name, values in metrics_dict.items():
                evals_result[dataset_name][metric_name] = values

    # --- Store model globally for download ---
    global_trained_model = model

    # ------------------------- Evaluation -------------------------
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1] if num_classes == 2 else None

    acc = accuracy_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)

    # Confusion matrix plot
    plt.figure(figsize=(5, 4))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues")
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format="png")
    plt.close("all")
    cm_plot = base64.b64encode(buf.getbuffer()).decode("utf8")

    # ROC curve (binary only)
    roc_plot = None
    auc_score = None
    if y_proba is not None:
        fpr, tpr, _ = roc_curve(y_test, y_proba)
        auc_score = roc_auc_score(y_test, y_proba)
        plt.figure(figsize=(5, 4))
        plt.plot(fpr, tpr, label=f"AUC={auc_score:.3f}")
        plt.plot([0, 1], [0, 1], "k--")
        plt.xlabel("False Positive Rate")
        plt.ylabel("True Positive Rate")
        plt.title("ROC Curve")
        plt.legend()
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format="png")
        plt.close()
        roc_plot = base64.b64encode(buf.getbuffer()).decode("utf8")

    # Accuracy/history plot (shared for both models)
    acc_plot = None
    if evals_result:
        plt.figure(figsize=(6, 4))
        for dataset_name, metrics_dict in evals_result.items():
            for metric_name, values in metrics_dict.items():
                plt.plot(values, label=f"{dataset_name}-{metric_name}")
        plt.xlabel("Iteration")
        plt.ylabel("Metric")
        plt.title("Training History")
        plt.legend()
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format="png")
        plt.close()
        acc_plot = base64.b64encode(buf.getbuffer()).decode("utf8")

    return jsonify({
        "accuracy": acc,
        "confusion_matrix_plot": cm_plot,
        "roc_plot": roc_plot,
        "auc_score": auc_score,
        "accuracy_plot": acc_plot
    })

@app.route("/predict", methods=["POST"])
def predict_with_pretrained():
    global global_df_core, global_df_unscaled, global_predictions
    if global_df_core is None:
        return jsonify({"error": "No dataset uploaded yet."}), 400
    
    try:
        # --- More Robust Dynamic Model Selection ---
        # Define characteristic features for each dataset type before renaming.
        kepler_features = ['koi_prad']
        tess_features = ['pl_trandurh']
        
        # Inspect the columns of the uploaded, unscaled data to decide which model to use.
        dataset_columns = global_df_unscaled.columns
        model_path = ""
        
        # Check if ANY of the characteristic Kepler features are present.
        if any(kf in dataset_columns for kf in kepler_features):
            model_path = "xgb_kepler_model.pkl"
            print(f"✅ Detected Kepler dataset. Loading {model_path}")
        # Check if ANY of the characteristic TESS features are present.
        elif any(tf in dataset_columns for tf in tess_features):
            model_path = "xgb_tess_model.pkl"
            print(f"✅ Detected TESS dataset. Loading {model_path}")
        # If neither, default to the K2 model.
        else:
            model_path = "xgb_k2_model.pkl"
            print(f"✅ No specific Kepler/TESS features found. Loading default model: {model_path}")

        # Load the selected pretrained model
        model = joblib.load(model_path)

        # --- Robust Feature Matching ---
        # Get the feature names the model was trained on
        if hasattr(model, 'get_booster'): # XGBoost
            model_features = model.get_booster().feature_names
        elif hasattr(model, 'feature_name_'): # LightGBM
            model_features = model.feature_name_
        else:
            raise TypeError(f"Could not determine feature names from model of type {type(model).__name__}")

        # Prepare the dataframe for prediction
        X_predict = global_df_core.copy()
        for col in model_features:
            if col not in X_predict.columns:
                X_predict[col] = 0 # Add missing columns and fill with 0
        
        # Ensure the column order is exactly what the model expects
        X_predict = X_predict[model_features]
        
        # Use the unscaled dataframe to get the original values for visualization
        raw_data_for_prediction = global_df_unscaled.to_dict(orient='records')

        preds = model.predict(X_predict)
        
        # Store predictions globally for download
        global_predictions = preds.tolist()

        return jsonify({
            "predictions": preds.tolist(),
            "count": len(preds),
            "raw_data_for_prediction": raw_data_for_prediction # Send the data to the frontend
        })
    
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

@app.route("/download_predictions", methods=["GET"])
def download_predictions():
    global global_df_unscaled, global_predictions
    if global_df_unscaled is None or global_predictions is None:
        return jsonify({"error": "No predictions have been generated to download."}), 400

    try:
        df_to_download = global_df_unscaled.copy()
        df_to_download['prediction'] = global_predictions
        
        # Map numeric predictions back to human-readable labels
        prediction_map = {0: 'FALSE POSITIVE', 1: 'CANDIDATE', 2: 'CONFIRMED'}
        df_to_download['prediction_label'] = df_to_download['prediction'].map(prediction_map)

        buf = io.BytesIO()
        df_to_download.to_csv(buf, index=False)
        buf.seek(0)
        
        return send_file(
            buf,
            mimetype="text/csv",
            as_attachment=True,
            download_name="orbital_horizon_predictions.csv"
        )
    except Exception as e:
        return jsonify({"error": f"Failed to create CSV: {str(e)}"}), 500

@app.route("/predict_with_uploaded_model", methods=["POST"])
def predict_with_uploaded_model():
    global global_df_core, global_df_unscaled, global_predictions, global_features
    if global_df_core is None:
        return jsonify({"error": "Please upload and process a dataset first."}), 400

    model_file = request.files.get("model_file")
    if not model_file:
        return jsonify({"error": "No model file was uploaded."}), 400

    try:
        # Load the model from the uploaded file stream
        model = joblib.load(model_file)

        X = global_df_core[global_features]

        # Use the unscaled dataframe to get the original values for visualization
        raw_data_for_prediction = global_df_unscaled.to_dict(orient='records')

        preds = model.predict(X)
        
        # Store predictions globally for download
        global_predictions = preds.tolist()

        return jsonify({
            "predictions": preds.tolist(),
            "count": len(preds),
            "raw_data_for_prediction": raw_data_for_prediction
        })
    
    except Exception as e:
        return jsonify({"error": f"Failed to make predictions with the uploaded model: {str(e)}"}), 500

@app.route("/download_model", methods=["GET"])
def download_model():
    global global_trained_model
    if global_trained_model is None:
        return jsonify({"error": "No model has been trained yet."}), 400

    try:
        # Determine model type for filename
        model_type = "model"
        if isinstance(global_trained_model, XGBClassifier):
            model_type = "xgb"
        elif isinstance(global_trained_model, LGBMClassifier):
            model_type = "lgbm"

        buf = io.BytesIO()
        joblib.dump(global_trained_model, buf)
        buf.seek(0)

        return send_file(
            buf,
            mimetype="application/octet-stream",
            as_attachment=True,
            download_name=f"trained_{model_type}_model.pkl"
        )
    except Exception as e:
        return jsonify({"error": f"Failed to prepare model for download: {str(e)}"}), 500

@app.route("/reset", methods=["POST"])
def reset_state():
    global global_features, global_target, global_df_core, global_df_unscaled, global_predictions, global_trained_model
    
    global_features = None
    global_target = None
    global_df_core = None
    global_df_unscaled = None
    global_predictions = None
    global_trained_model = None
    
    print("🔄 Server state has been reset.")
    return jsonify({"message": "Server state cleared successfully."}), 200

@app.route("/download_sample/<dataset_name>", methods=["GET"])
def download_sample(dataset_name):
    # Map the short name from the URL to the full GitHub raw URL
    dataset_urls = {
        "kepler": "https://raw.githubusercontent.com/qgacabrera-bit/OrbitalHorizon/refs/heads/main/assets/cumulative_2025.09.25_12.58.46.csv",
        "k2": "https://raw.githubusercontent.com/qgacabrera-bit/OrbitalHorizon/refs/heads/main/assets/k2pandc_2025.09.25_12.59.27.csv",
        "tess": "https://raw.githubusercontent.com/qgacabrera-bit/OrbitalHorizon/refs/heads/main/assets/TOI_2025.09.25_11.42.37.csv"
    }

    url = dataset_urls.get(dataset_name)
    if not url:
        return jsonify({"error": "Invalid dataset name"}), 404

    try:
        # Fetch the file content from the external URL
        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)

        # Create a file-like object in memory
        file_buffer = io.BytesIO(response.content)

        # Send the file to the user, forcing a download
        return send_file(
            file_buffer,
            as_attachment=True,
            download_name=f"{dataset_name}_data.csv",
            mimetype="text/csv"
        )
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to fetch the dataset: {str(e)}"}), 502

@app.route("/predict_single", methods=["POST"])
def predict_single_object():
    """
    Predicts the classification for a single object based on input features.
    """
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    
    # Define the expected features in the correct order for the model
    # This should match the features the pre-trained model was trained on.
    # We'll use the Kepler model's features as a default.
    model_features = [
        'pl_rade', 'pl_orbper', 'pl_trandep', 'pl_trandurh', 
        'pl_eqt', 'pl_insol', 'st_teff', 'st_rad', 'ra', 'dec'
    ]

    try:
        # Create a DataFrame for the single prediction
        # Fill any missing features with 0
        input_data = {feat: [data.get(feat, 0)] for feat in model_features}
        df_predict = pd.DataFrame(input_data)

        # Load the pre-trained model (e.g., the Kepler model as a robust default)
        model_path = "xgb_kepler_model.pkl"
        model = joblib.load(model_path)

        # Ensure column order matches the model's expectation
        df_predict = df_predict[model_features]

        # Make the prediction
        prediction = model.predict(df_predict)
        
        # Return the single prediction result (0, 1, or 2)
        return jsonify({"prediction": int(prediction[0])})

    except Exception as e:
        return jsonify({"error": f"Single prediction failed: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True)