const preprocessingResultsDiv = document.getElementById("preprocessing-results");
const preprocessingHeader = document.getElementById("preprocessing-header");
const trainingResultsDiv = document.getElementById("training-results");
const resultsContainer = document.getElementById("results-container");
const trainControlsSection = document.getElementById("trainControlsSection"); // This ID is in the new HTML
const trainBtn = document.getElementById("trainBtn");
const modelSelect = document.getElementById("modelSelect");
const predictBtn = document.getElementById("predictBtn");
const downloadPredictionsBtn = document.getElementById("downloadPredictionsBtn");
const downloadModelBtn = document.getElementById("downloadModelBtn");
const fileInput = document.getElementById("fileInput");
const fileNameSpan = document.getElementById("fileName");
const xgbParamsDiv = document.getElementById("xgbParams");
const modelFileInput = document.getElementById("modelFileInput");
const modelFileNameSpan = document.getElementById("modelFileName");
const predictWithCustomBtn = document.getElementById("predictWithCustomBtn");
const resetBtn = document.getElementById("resetBtn");
const processingOverlay = document.getElementById("processing-overlay");
const processingOverlayText = document.getElementById("processing-overlay-text");
const uploadSection = document.getElementById("uploadSection");

// --- Sample Dataset Buttons ---
const runKeplerSampleBtn = document.getElementById("runKeplerSample");
const runK2SampleBtn = document.getElementById("runK2Sample");
const runTessSampleBtn = document.getElementById("runTessSample");

// --- Single Prediction Elements ---
const singlePredictBtn = document.getElementById("singlePredictBtn");
const singlePredictionResultDiv = document.getElementById("single-prediction-result");
const singlePredictionHeader = document.getElementById("single-prediction-header");
const singlePredictionBody = document.getElementById("single-prediction-body");

// --- Collapsible Preprocessing Section ---
if (preprocessingHeader) {
    preprocessingHeader.addEventListener("click", () => {
        preprocessingResultsDiv.classList.toggle("collapsed");
        const icon = preprocessingHeader.querySelector("i");
        icon.classList.toggle("fa-chevron-up");
        icon.classList.toggle("fa-chevron-down");
    });
}

// --- Collapsible Single Prediction Section ---
if (singlePredictionHeader) {
    singlePredictionHeader.addEventListener("click", () => {
        singlePredictionBody.classList.toggle("collapsed");
        const icon = singlePredictionHeader.querySelector("i");
        icon.classList.toggle("fa-chevron-up");
        icon.classList.toggle("fa-chevron-down");
    });
}


modelSelect.addEventListener("change", () => {
  xgbParamsDiv.style.display = modelSelect.value === "xgb" ? "flex" : "none";
});

// Helper functions
function addStep(message, isLoading = false) {
  resultsContainer.style.display = "block";
  const step = document.createElement("div");
  step.className = "step";
  step.innerHTML = isLoading ? `<span class="loading"></span> ${message}` : message;
  preprocessingResultsDiv.appendChild(step);
  return step;
}

function updateStep(stepElement, newMessage, extraContent = "") {
  stepElement.innerHTML = newMessage + extraContent;
}

// Update filename display and enable upload button
fileInput.addEventListener("change", () => {
  const uploadBtn = document.getElementById("uploadBtn");
  if (fileInput.files.length > 0) {
    fileNameSpan.textContent = fileInput.files[0].name;
    uploadBtn.disabled = false;
  } else {
    fileNameSpan.textContent = "No file chosen";
    uploadBtn.disabled = true;
  }
});

// Update model filename display and enable custom predict button
modelFileInput.addEventListener("change", () => {
  if (modelFileInput.files.length > 0) {
    modelFileNameSpan.textContent = modelFileInput.files[0].name;
    predictWithCustomBtn.disabled = false;
  } else {
    modelFileNameSpan.textContent = "No model chosen";
    predictWithCustomBtn.disabled = true;
  }
});

// Reset the entire workbench
async function resetWorkbench() {
  // 1. Reset UI elements
  trainControlsSection.style.display = "none";
  resultsContainer.style.display = "none";
  preprocessingResultsDiv.innerHTML = "";
  trainingResultsDiv.innerHTML = "";

  // Reset file inputs
  fileInput.value = null;
  fileNameSpan.textContent = "No file chosen";
  document.getElementById("uploadBtn").disabled = true;

  modelFileInput.value = null;
  modelFileNameSpan.textContent = "No model chosen";
  predictWithCustomBtn.disabled = true;

  // Hide download buttons
  downloadPredictionsBtn.style.display = "none";
  downloadModelBtn.style.display = "none";

  // Restore visibility of upload section
  if (uploadSection) uploadSection.style.display = "flex";

  // 2. Notify backend to clear its state
  try {
    await fetch("https://project-oracle.onrender.com/reset", {
      method: "POST"
    });
    console.log("✅ Backend state cleared.");
  } catch (err) {
    console.error("⚠️ Could not reset backend state:", err);
  }
}

resetBtn.addEventListener("click", resetWorkbench);

if (singlePredictBtn) {
    singlePredictBtn.addEventListener("click", runSinglePrediction);
}


// --- New: Handle Sample Dataset Runs ---
async function runSample(datasetName) {
  // 1. Reset the workbench to a clean state
  await resetWorkbench();

  // Hide control panels during sample run
  if (uploadSection) uploadSection.style.display = "none";

  // 2. Show a loading message
  resultsContainer.style.display = "block";
  processingOverlay.style.display = "flex";
  processingOverlayText.textContent = `Running ${datasetName} sample...`;
  

  try {
    // 3. Fetch the sample dataset file from the backend
    const response = await fetch(`https://project-oracle.onrender.com/download_sample/${datasetName}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch sample data. Status: ${response.status}`);
    }
    const blob = await response.blob();
    const file = new File([blob], `${datasetName}_data.csv`, { type: 'text/csv' });

    // 4. Use the existing uploadAndProcess function to handle the file
    // We pass the file object directly. The function will handle the rest.
    await uploadAndProcess(file, true); // Pass true to indicate a sample run

    // 5. Once preprocessing is done, automatically run prediction
    // A small delay can make the transition feel smoother to the user
    setTimeout(() => {
      predictBtn.click();
    }, 500);

  } catch (err) {
    console.error(`❌ Error running ${datasetName} sample:`, err);
    preprocessingResultsDiv.innerHTML = `<div class="step">❌ Error: ${err.message}</div>`;
    // Restore controls on error
    if (uploadSection) uploadSection.style.display = "flex";
    processingOverlay.style.display = "none";
  }
}

if (runKeplerSampleBtn) {
  runKeplerSampleBtn.addEventListener("click", () => runSample("kepler"));
}
if (runK2SampleBtn) {
  runK2SampleBtn.addEventListener("click", () => runSample("k2"));
}
if (runTessSampleBtn) {
  runTessSampleBtn.addEventListener("click", () => runSample("tess"));
}

// --- Modified uploadAndProcess to be reusable ---
async function uploadAndProcess(file, isSampleRun = false) {
  if (!file) return; // No alert needed for sample runs

  preprocessingResultsDiv.innerHTML = ""; // Clear old preprocessing results
  trainingResultsDiv.innerHTML = ""; // Clear old training results
  downloadPredictionsBtn.style.display = "none"; // Hide download button on new upload
  downloadModelBtn.style.display = "none"; // Hide model download button on new upload

  let formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("https://project-oracle.onrender.com/upload", {
      method: "POST",
      body: formData
    });

    const result = await response.json();
    console.log("✅ Backend response:", result);

    if(result.error){
      preprocessingResultsDiv.innerHTML = `<div class="step">❌ Error: ${result.error}</div>`;
      return;
    }

    addStep("✅ Dataset processed successfully!");

    // Show training section after successful upload, but NOT for sample runs
    if (!isSampleRun) {
      trainControlsSection.style.display = "block";
    }

    // Display preprocessing details without individual loading spinners
    const step2 = addStep("Checking for missing values...");
    if (result.missing_counts) {
      let tableHTML = "<table><tr><th>Column</th><th>Missing Values</th></tr>";
      for (let col in result.missing_counts) {
        tableHTML += `<tr><td>${col}</td><td>${result.missing_counts[col]}</td></tr>`;
      }
      tableHTML += "</table>";
      updateStep(step2, "✅ Missing values check complete.", tableHTML);
    } else {
      updateStep(step2, "⚠️ Missing values info not available.");
    }

    // Step 3: Extracted raw features (Temp & Radius)
    const step3 = addStep("Extracting Temperature & Radius...");
    if (result.temperature_columns.length > 0 || result.radius_columns.length > 0) {
      let html = "";

      // 🔹 Temperature Table
      if (result.temperature_columns.length > 0) {
        html += "<h4>Temperature Columns:</h4>";
        let tempKeys = result.temperature_columns;
        let tempTable = `<table><tr>${tempKeys.map(k => `<th>${k}</th>`).join("")}</tr>`;
        result.extracted_raw.forEach(r => {
          tempTable += `<tr>${tempKeys.map(k => `<td>${r[k] !== undefined ? r[k] : ""}</td>`).join("")}</tr>`;
        });
        tempTable += "</table>";
        html += tempTable;
      }

      // 🔹 Radius Table
      if (result.radius_columns.length > 0) {
        html += "<h4>Radius Columns:</h4>";
        let radKeys = result.radius_columns;
        let radTable = `<table><tr>${radKeys.map(k => `<th>${k}</th>`).join("")}</tr>`;
        result.extracted_raw.forEach(r => {
          radTable += `<tr>${radKeys.map(k => `<td>${r[k] !== undefined ? r[k] : ""}</td>`).join("")}</tr>`;
        });
        radTable += "</table>";
        html += radTable;
      }

      updateStep(step3, "✅ Temp & Radius extracted.", html);
    } else {
      updateStep(step3, "❌ Could not find Temperature & Radius columns.");
    }

    // Step 4: Feature engineered (only engineered cols)
    const step4 = addStep("Normalizing & engineering features...");
    if (result.extracted_normalized && Array.isArray(result.extracted_normalized) && result.extracted_normalized.length > 0) {
      let keys = Object.keys(result.extracted_normalized[0]);
      let tableHTML = `<table><tr>${keys.map(k => `<th>${k}</th>`).join("")}</tr>`;
      result.extracted_normalized.forEach(r => {
        tableHTML += `<tr>${keys.map(k => `<td>${r[k].toFixed ? r[k].toFixed(3) : r[k]}</td>`).join("")}</tr>`;
      });
      tableHTML += "</table>";
      updateStep(step4, "✅ Engineered features generated.", tableHTML);
    } else {
      updateStep(step4, "⚠️ No engineered features found.");
    }

    // Step 5: Target column
    const step5 = addStep("Extracting target column...");
    if (result.targets_raw && Array.isArray(result.targets_raw) && result.targets_raw.length > 0) {
      let rawList = "<pre>" + JSON.stringify(result.targets_raw, null, 2) + "</pre>";
      let numList = "<pre>" + JSON.stringify(result.targets_numeric, null, 2) + "</pre>";
      updateStep(
        step5,
        `✅ Target column extracted (${result.target_column || "unknown"}).`,
        `<h4>Raw values:</h4>${rawList}<h4>Numeric encoding:</h4>${numList}`
      );
    } else {
      updateStep(step5, "❌ Target column not found.");
    }
  } catch (err) {
    console.error("❌ Frontend error:", err);
    preprocessingResultsDiv.innerHTML = `<div class="step">❌ Error: ${err.message}</div>`;
  }
}

// Upload CSV and process dataset (Event Listener)
document.getElementById("uploadBtn").addEventListener("click", async () => {
  const file = fileInput.files[0];
  await uploadAndProcess(file);
});


// Train model
trainBtn.addEventListener("click", async () => {
  const model = document.getElementById("modelSelect").value;
  trainingResultsDiv.innerHTML = ""; // Clear previous results
  trainingResultsDiv.style.display = "block";

  // Use the main processing overlay
  processingOverlay.style.display = "flex";
  processingOverlayText.textContent = "Training model...";
  resultsContainer.style.display = "block";


  // Collect XGB hyperparameters
  const n_estimators = parseInt(document.getElementById("nEstimators").value) || 100; // Corrected ID
  const max_depth = parseInt(document.getElementById("maxDepth").value) || 3;
  const learning_rate = parseFloat(document.getElementById("learningRate").value) || 0.1;

  const hyperparams = { n_estimators, max_depth, learning_rate };

  try {
    const response = await fetch("https://project-oracle.onrender.com/train", {
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({model, hyperparams})
    });

    const result = await response.json();
    if(result.error){
      preprocessingResultsDiv.innerHTML = `<div class="step">❌ Error: ${result.error}</div>`;
      trainingResultsDiv.innerHTML = `<div class="step">❌ Training Error: ${result.error}</div>`;
      processingOverlay.style.display = "none";
      return;
    }


    let trainingHTML = `<div class="step">✅ Model trained successfully!</div>`;

    // 🔹 Metrics
    trainingHTML += `<div class="metrics-grid">`;
    trainingHTML += `<div class="metric-card"><h4>Accuracy</h4><p>${(result.accuracy * 100).toFixed(2)}%</p></div>`;
    if(result.auc_score) {
      trainingHTML += `<div class="metric-card"><h4>ROC AUC Score</h4><p>${result.auc_score.toFixed(3)}</p></div>`;
    }
    trainingHTML += `</div>`;

    // 🔹 Plots
    trainingHTML += `<div class="plots-grid">`;

    // 🔹 Confusion Matrix
    const cm_src = `data:image/png;base64,${result.confusion_matrix_plot}`;
    trainingHTML += `<div class="plot-card">
                        <div class="plot-header">
                            <h4>Confusion Matrix</h4>
                            <a href="${cm_src}" download="confusion_matrix.png" class="download-btn" title="Download Plot"><i class="fas fa-download"></i></a>
                        </div>
                        <img src="${cm_src}" alt="Confusion Matrix">
                     </div>`;

    // 🔹 ROC Curve (if available)
    if(result.roc_plot){
      const roc_src = `data:image/png;base64,${result.roc_plot}`;
      trainingHTML += `<div class="plot-card">
                            <div class="plot-header">
                                <h4>ROC Curve</h4>
                                <a href="${roc_src}" download="roc_curve.png" class="download-btn" title="Download Plot"><i class="fas fa-download"></i></a>
                            </div>
                            <img src="${roc_src}" alt="ROC Curve">
                         </div>`;
    }

    // 🔹 Accuracy Plot (Training History)
    if(result.accuracy_plot && result.accuracy_plot !== "null"){
      const acc_src = `data:image/png;base64,${result.accuracy_plot}`;
      trainingHTML += `<div class="plot-card">
                            <div class="plot-header">
                                <h4>Training History</h4>
                                <a href="${acc_src}" download="training_history.png" class="download-btn" title="Download Plot"><i class="fas fa-download"></i></a>
                            </div>
                            <img src="${acc_src}" alt="Training History">
                         </div>`;
    } else {
      trainingHTML += `<div class="plot-card"><div class="plot-header"><h4>Training History</h4></div><p><i>No training history plot available for this model.</i></p></div>`;
    }

    trainingHTML += `</div>`; // end plots-grid

    trainingResultsDiv.innerHTML = trainingHTML;

    // Show the download model button
    downloadModelBtn.style.display = "inline-block";

    processingOverlay.style.display = "none";

  } catch(err){
    // If training fails, update the step in the preprocessing area
    trainingResultsDiv.innerHTML = `<div class="step">❌ Training Error: ${err.message}</div>`;
    processingOverlay.style.display = "none";
  }
});

// Predict with pre-trained model
predictBtn.addEventListener("click", async () => {
  trainingResultsDiv.innerHTML = ""; // Clear previous results
  trainingResultsDiv.style.display = "block";

  // Use the main processing overlay
  processingOverlay.style.display = "flex";
  processingOverlayText.textContent = "Running prediction...";
  resultsContainer.style.display = "block";

  try {
    const response = await fetch("https://project-oracle.onrender.com/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorResult = await response.json();
      throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // --- Auto-collapse the preprocessing section ---
    if (!preprocessingResultsDiv.classList.contains("collapsed")) {
      preprocessingResultsDiv.classList.add("collapsed");
      const icon = preprocessingHeader.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-chevron-up");
        icon.classList.add("fa-chevron-down");
      }
    }

    let predictionHTML = `<div class="step">✅ Prediction complete! Found ${result.count} potential objects.</div>`;

    // --- New: Count all prediction types ---
    const counts = { 0: 0, 1: 0, 2: 0 };
    const confirmedPlanets = []; // This will now hold data objects
    result.predictions.forEach((pred, index) => {
        counts[pred] = (counts[pred] || 0) + 1;
        if (pred === 2) {
            // Get the raw data for this planet from the initial upload result
            const planetData = result.raw_data_for_prediction[index];
            confirmedPlanets.push({ index: index + 1, data: planetData });
        }
    });

    predictionHTML += `<div class="metrics-grid">
                        <div class="metric-card">
                            <h4>Confirmed Planets Found</h4>
                            <p>${counts[2]}</p>
                        </div>
                        <div class="metric-card">
                            <h4>Candidates Found</h4>
                            <p>${counts[1]}</p>
                        </div>
                        <div class="metric-card">
                            <h4>False Positives</h4>
                            <p>${counts[0]}</p>
                        </div>
                       </div>`;

    if (confirmedPlanets.length > 0) {
      predictionHTML += `<div class="plot-card">
                            <div class="plot-header"><h4>Discovered Planets (Prediction = 2)</h4></div>`;
      let tableHTML = "<table><tr><th>Original Row #</th><th>Action</th></tr>";
      confirmedPlanets.forEach(planet => {
        // Create URL parameters from the planet's data
        const params = new URLSearchParams({
            radius: planet.data.pl_rade || 50, // Default to 50 if null
            temp: planet.data.pl_eqt || 0,
            insol: planet.data.pl_insol || 50,
            stellar_temp: planet.data.st_teff || 'N/A',
            name: planet.data.kepoi_name || planet.data.pl_name || `Predicted Planet #${planet.index}`,
            stellar_radius: planet.data.st_rad || 'N/A',
            period: planet.data.pl_orbper || 'N/A'
        }).toString();
        tableHTML += `<tr><td>${planet.index}</td><td><a href="planet.html?${params}" target="_blank" class="sim-link">Visualize in Simulator <i class="fas fa-external-link-alt"></i></a></td></tr>`;
      });
      tableHTML += "</table>";
      predictionHTML += tableHTML;
      predictionHTML += `</div>`;
    }

    trainingResultsDiv.innerHTML = predictionHTML;

    // Show the download button
    downloadPredictionsBtn.style.display = "inline-block";

    // Restore the upload section if it was hidden (e.g., during a sample run)
    if (uploadSection) uploadSection.style.display = "flex";

    processingOverlay.style.display = "none";

  } catch (err) {
    console.error("❌ Prediction error:", err);
    trainingResultsDiv.innerHTML = `<div class="step">❌ Prediction Error: ${err.message}</div>`;
  }
});

// Predict with UPLOADED model
predictWithCustomBtn.addEventListener("click", async () => {
  const modelFile = modelFileInput.files[0];
  if (!modelFile) {
    return alert("Please select a model file (.pkl) to upload.");
  }

  trainingResultsDiv.innerHTML = ""; // Clear previous results
  trainingResultsDiv.style.display = "block";

  // Use the main processing overlay
  processingOverlay.style.display = "flex";
  processingOverlayText.textContent = "Running prediction with custom model...";
  resultsContainer.style.display = "block";

  const formData = new FormData();
  formData.append("model_file", modelFile);

  try {
    const response = await fetch("https://project-oracle.onrender.com/predict_with_uploaded_model", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status} ${response.statusText}`;
      try {
        const errorResult = await response.json();
        errorMessage = errorResult.error || errorMessage;
      } catch (e) {
        // Response was not JSON, do nothing and use the HTTP status error message.
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();

    // --- Auto-collapse the preprocessing section ---
    if (!preprocessingResultsDiv.classList.contains("collapsed")) {
      preprocessingResultsDiv.classList.add("collapsed");
      const icon = preprocessingHeader.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-chevron-up");
        icon.classList.add("fa-chevron-down");
      }
    }

    // --- This result display logic is identical to the pre-trained model's logic ---
    let predictionHTML = `<div class="step">✅ Prediction with custom model complete! Found ${result.count} potential objects.</div>`;
    const counts = { 0: 0, 1: 0, 2: 0 };
    const confirmedPlanets = [];
    result.predictions.forEach((pred, index) => {
        counts[pred] = (counts[pred] || 0) + 1;
        if (pred === 2) {
            const planetData = result.raw_data_for_prediction[index];
            confirmedPlanets.push({ index: index + 1, data: planetData });
        }
    });

    predictionHTML += `<div class="metrics-grid">
                        <div class="metric-card"><h4>Confirmed Planets Found</h4><p>${counts[2]}</p></div>
                        <div class="metric-card"><h4>Candidates Found</h4><p>${counts[1]}</p></div>
                        <div class="metric-card"><h4>False Positives</h4><p>${counts[0]}</p></div>
                       </div>`;

    if (confirmedPlanets.length > 0) {
      predictionHTML += `<div class="plot-card"><div class="plot-header"><h4>Discovered Planets (Prediction = 2)</h4></div>`;
      let tableHTML = "<table><tr><th>Original Row #</th><th>Action</th></tr>";
      confirmedPlanets.forEach(planet => {
        const params = new URLSearchParams({
            radius: planet.data.pl_rade || 50, temp: planet.data.pl_eqt || 0, insol: planet.data.pl_insol || 50,
            stellar_temp: planet.data.st_teff || 'N/A', name: planet.data.kepoi_name || planet.data.pl_name || `Predicted Planet #${planet.index}`,
            stellar_radius: planet.data.st_rad || 'N/A', period: planet.data.pl_orbper || 'N/A'
        }).toString();
        tableHTML += `<tr><td>${planet.index}</td><td><a href="planet.html?${params}" target="_blank" class="sim-link">Visualize in Simulator <i class="fas fa-external-link-alt"></i></a></td></tr>`;
      });
      tableHTML += "</table>";
      predictionHTML += tableHTML;
      predictionHTML += `</div>`;
    }

    trainingResultsDiv.innerHTML = predictionHTML;
    downloadPredictionsBtn.style.display = "inline-block";

    // Restore the upload section if it was hidden
    if (uploadSection) uploadSection.style.display = "flex";

    processingOverlay.style.display = "none";

  } catch (err) {
    console.error("❌ Custom prediction error:", err);
    trainingResultsDiv.innerHTML = `<div class="step">❌ Prediction Error: ${err.message}</div>`;
  }
});

// Download predictions
downloadPredictionsBtn.addEventListener("click", async () => {
  try {
    const response = await fetch("https://project-oracle.onrender.com/download_predictions", {
      method: "GET"
    });

    if (!response.ok) {
      let errorMessage = `Failed to download CSV. Status: ${response.status}`;
      try {
        const errorResult = await response.json();
        errorMessage = errorResult.error || errorMessage;
      } catch (e) {
        // Not a JSON response
      }
      throw new Error(errorMessage);
    }

    // Trigger file download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = "orbital_horizon_predictions.csv";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

  } catch (err) {
    alert("Download Error: " + err.message);
    console.error("❌ Download error:", err);
  }
});

// Download trained model
downloadModelBtn.addEventListener("click", async () => {
  try {
    const response = await fetch("https://project-oracle.onrender.com/download_model", {
      method: "GET"
    });

    if (!response.ok) {
      let errorMessage = `Failed to download model. Status: ${response.status}`;
      try {
        const errorResult = await response.json();
        errorMessage = errorResult.error || errorMessage;
      } catch (e) {
        // Not a JSON response
      }
      throw new Error(errorMessage);
    }

    // Get model type from dropdown to create a good filename
    const modelType = modelSelect.value;

    // Trigger file download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `trained_${modelType}_model.pkl`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

  } catch (err) {
    alert("Download Error: " + err.message);
    console.error("❌ Model download error:", err);
  }
});

// --- New: Single Prediction Logic ---
async function runSinglePrediction() {
    const features = {
        pl_rade: parseFloat(document.getElementById("sp-radius").value) || 0,
        pl_eqt: parseFloat(document.getElementById("sp-temp").value) || 0,
        pl_insol: parseFloat(document.getElementById("sp-insol").value) || 0,
        pl_orbper: parseFloat(document.getElementById("sp-period").value) || 0,
        st_teff: parseFloat(document.getElementById("sp-stellar-temp").value) || 0,
        st_rad: parseFloat(document.getElementById("sp-stellar-radius").value) || 0,
    };

    // Basic validation
    if (Object.values(features).some(v => v === 0)) {
        alert("Please fill in all fields with non-zero values for an accurate prediction.");
        return;
    }

    singlePredictionResultDiv.style.display = "block";
    singlePredictionResultDiv.innerHTML = `<div class="step"><span class="loading"></span> Running prediction...</div>`;

    try {
        const response = await fetch("https://project-oracle.onrender.com/predict_single", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(features)
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        let resultHTML = '';
        let resultClass = '';
        let resultText = '';

        if (result.prediction === 2) { // Confirmed
            resultClass = 'confirmed';
            resultText = 'CONFIRMED PLANET';
        } else if (result.prediction === 1) { // Candidate
            resultClass = 'candidate';
            resultText = 'PLANETARY CANDIDATE';
        } else { // False Positive
            resultClass = 'false-positive';
            resultText = 'FALSE POSITIVE';
        }

        // If it's a planet or a candidate, add the visualization link.
        if (result.prediction === 1 || result.prediction === 2) {
            const params = new URLSearchParams({
                radius: features.pl_rade,
                temp: features.pl_eqt - 273.15, // Convert K to C for simulator
                insol: features.pl_insol,
                stellar_temp: features.st_teff,
                name: "Predicted Object",
                stellar_radius: features.st_rad, // Pass Solar Radii directly
                period: features.pl_orbper
            }).toString();
            resultHTML += ` <a href="planet.html?${params}" target="_blank" class="sim-link">Visualize in Simulator <i class="fas fa-external-link-alt"></i></a>`;
        }
        singlePredictionResultDiv.innerHTML = `<div class="step">Prediction Result: <strong class="${resultClass}">${resultText}</strong>${resultHTML}</div>`;
        // Automatically expand the panel to show the result
        if (singlePredictionBody.classList.contains("collapsed")) {
            singlePredictionHeader.click();
        }

    } catch (err) {
        singlePredictionResultDiv.innerHTML = `<div class="step">❌ Prediction Error: ${err.message}</div>`;
        console.error("❌ Single prediction error:", err);
    }
}
 