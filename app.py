from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import subprocess
import base64
import uuid
from io import BytesIO

# --- Flask App Setup ---
app = Flask(__name__)
# IMPORTANT: CORS is needed to allow the React frontend to make requests
CORS(app) 

# Directory to store temporary files (input/output)
TEMP_DIR = 'temp_audio'
if not os.path.exists(TEMP_DIR):
    os.makedirs(TEMP_DIR)

# --- Python Logic File Paths (Must be in the same directory as this script) ---
# NOTE: The "first" script is integrated directly into the Flask route (saving the file).
PROCESS_SCRIPT_PATH = 'record_and_process.py'

@app.route('/api/process-audio', methods=['POST'])
def process_audio():
    """
    Handles the audio upload, executes the Python processing script, 
    and returns the resulting audio file.
    """
    if 'audio' not in request.json:
        return jsonify({"error": "Missing 'audio' data in request."}), 400

    base64_audio = request.json['audio']
    
    # 1. Decode and Save the Input WAV File (Simulating your first Python script)
    try:
        audio_data = base64.b64decode(base64_audio)
    except Exception as e:
        return jsonify({"error": f"Failed to decode base64 audio: {str(e)}"}), 400

    # Use a unique ID to manage temporary files for concurrent users
    unique_id = str(uuid.uuid4())
    input_filename = os.path.join(TEMP_DIR, f"{unique_id}_input.wav")
    output_filename = os.path.join(TEMP_DIR, f"{unique_id}_output.wav")

    try:
        # Save the temporary input file
        with open(input_filename, 'wb') as f:
            f.write(audio_data)
        
        # 2. Execute the second Python Script (record_and_process.py)
        # This script takes the input file and produces the output file
        command = [
            'python', 
            PROCESS_SCRIPT_PATH, 
            '--input', input_filename, 
            '--output', output_filename
        ]
        
        print(f"Executing: {' '.join(command)}")
        
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        print("Script stdout:", result.stdout)
        
        if not os.path.exists(output_filename):
            return jsonify({"error": "Processing script failed to create output file."}), 500

        # 3. Return the Output WAV File
        return send_file(output_filename, mimetype="audio/wav", as_attachment=True, download_name="gemini_feedback.wav")

    except subprocess.CalledProcessError as e:
        print(f"Subprocess Error: {e.stderr}")
        return jsonify({"error": f"Python processing error: {e.stderr}"}), 500
    except Exception as e:
        print(f"Server Error: {str(e)}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500
    finally:
        # 4. Cleanup temporary files
        if os.path.exists(input_filename):
            os.remove(input_filename)
        # NOTE: We clean up the output file only after sending it successfully in a real app,
        # but for simplicity here, we leave it to be cleaned up manually or by a separate task.
        # For this example, we'll try to remove it after sending.
        # A more robust solution involves storing files temporarily in memory or using a queue.
        if os.path.exists(output_filename):
            # This removal is tricky right after send_file, but required for cleanup.
            # In production, use 'after_request' or a temporary in-memory file.
            pass


if __name__ == '__main__':
    # Ensure all required files are present
    if not os.path.exists(PROCESS_SCRIPT_PATH):
        print(f"CRITICAL ERROR: Missing required file '{PROCESS_SCRIPT_PATH}'")
        print("Please create the record_and_process.py script next to app.py.")
        exit(1)
        
    print("--- Flask Server Running ---")
    print("CORS enabled. Endpoint: /api/process-audio")
    # You must run this command in your terminal: export GOOGLE_API_KEY='your_api_key'
    # Then run: python app.py
    app.run(debug=True, port=5000)
