# VieTrans: In-Image Machine Translation (EN→VI)

**VieTrans**: An In-Image Machine Translation system capable of translating text inside images while preserving the original real-world background.

---

## Project Structure

The project consists of three main components:

- **`BE-Models/`**: Model source code (PyTorch), training scripts, and the Backend API (FastAPI).
- **`FE/`**: User interface (Frontend) built with React + Vite + TailwindCSS.
- **`IIMT30k_Vi/`**: Sample dataset used for testing and evaluation.

---

## Setup and Installation

### 1. Prerequisites

- **Python 3.10+** (Recommended to use a virtual environment like `venv` or `conda`).
- **Node.js 18+** & **npm**.
- **GPU** (Optional): Performance is significantly improved if an NVIDIA GPU (CUDA) or Apple Silicon (MPS) is available.

### 2. Backend Setup (Server)

Open your terminal and navigate to the backend directory:

```bash
cd BE-Models
# Create a virtual environment (optional)
python -m venv venv
source venv/bin/activate  # Or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt
```

**Note on PyTorch:**
The system automatically detects and uses Apple Metal (MPS) on Mac. For Windows/Linux with NVIDIA GPUs, ensure you install the CUDA-enabled version of `torch`.

### 3. Frontend Setup (UI)

Open a new terminal and navigate to the frontend directory:

```bash
cd FE
npm install
```

---

## Running the Application

You need to run both the Backend and Frontend **simultaneously**.

### Step 1: Start the Backend API

Navigate to the `server` directory inside `BE-Models` and run:

```bash
cd BE-Models/server
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

*The API will be available at: `http://localhost:8000`*

### Step 2: Start the Frontend

In the `FE` directory, run:

```bash
cd FE
npm run dev
```

*The UI will be available at: `http://localhost:5173` (or the port shown in your terminal)*

---

## Key Features

1. **Browse Samples**: Explore pre-processed examples from the `IIMT30k_Vi` test set.
2. **Live Translation**: Upload any image containing English text to translate it into Vietnamese in real-time.
3. **Pipeline Visualization**: View details for each processing stage:
   - **Separate**: Extracts text from the background.
   - **Translate**: Translates text features from English to Vietnamese.
   - **Fuse**: Merges the translated text back onto the original background.

---

## References/ License

- Paper: [Exploring In-Image Machine Translation with Real-World Background (ACL 2025)](https://arxiv.org/abs/2505.15282)
- Dataset: [IIMT30k on HuggingFace](https://huggingface.co/datasets/yztian/IIMT30k)
