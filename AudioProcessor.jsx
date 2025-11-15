import React, { useState, useRef, useCallback } from "react";
import { Mic, StopCircle, Volume2, Loader2, RefreshCw } from "lucide-react";

// Configuration
const FLASK_API_URL = "http://localhost:5000/api/process-audio";

const App = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Ready to record.");
  const [audioUrl, setAudioUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  // --- Utility Function ---
  const blobToBase64 = useCallback((blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // We send the full Base64 data including the mime type header
        const base64Data = reader.result.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      // Use readAsDataURL which gives the 'data:...' prefix
      reader.readAsDataURL(blob);
    });
  }, []);

  // --- Recording Logic ---

  const startRecording = async () => {
    if (isRecording || isProcessing) return;
    setAudioUrl(null); // Clear previous audio

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // NOTE: We must use a format compatible with most backends/libraries,
      // often 'audio/wav' is preferred, but 'audio/webm' is highly compatible
      // with browsers and can be handled by the backend.
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        sendToFlask(); // Transition to sending data
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setStatus("Recording... Tap STOP when finished reading.");
    } catch (error) {
      console.error("Error starting recording:", error);
      setStatus(`Error accessing microphone: ${error.message}`);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setStatus("Preparing audio to send to Flask...");
    setIsProcessing(true);
  };

  // --- Flask Bridge Logic (Simulating Python Execution) ---

  const sendToFlask = useCallback(async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });

    try {
      // 1. Convert Recorded Audio to Base64
      const recordedBase64 = await blobToBase64(audioBlob);

      setStatus("Sending audio to Flask server...");

      // 2. Send Base64 data to Flask API
      const response = await fetch(FLASK_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: recordedBase64 }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Server responded with status ${response.status}`
        );
      }

      setStatus("Server processed audio. Receiving feedback...");

      // 3. Receive the resulting WAV file (Blob) from the Flask server
      const finalAudioBlob = await response.blob();

      // 4. Create a URL and enable playback
      const url = URL.createObjectURL(finalAudioBlob);
      setAudioUrl(url);

      setStatus("Feedback ready. Tap PLAY to hear the final WAV.");
    } catch (error) {
      console.error("Flask/Processing Error:", error);
      setStatus(
        `Error connecting to or processing by the Flask server: ${error.message}. Ensure Flask is running.`
      );
    } finally {
      setIsProcessing(false);
    }
  }, [blobToBase64]);

  const playAudio = () => {
    if (audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play();
      setStatus("Playing model feedback...");
      audio.onended = () =>
        setStatus("Feedback played. Ready for next attempt.");
    }
  };

  const resetApp = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsRecording(false);
    setIsProcessing(false);
    setAudioUrl(null);
    setStatus("Tap Record to start.");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-[Inter]">
      <div className="w-full max-w-lg bg-white shadow-2xl rounded-xl p-8 space-y-8 border-t-4 border-indigo-500">
        <header className="text-center">
          <h1 className="text-3xl font-extrabold text-indigo-700">
            Pronunciation Bridge
          </h1>
          <p className="mt-2 text-gray-500">
            Frontend to run your Python scripts via a Flask API.
          </p>
        </header>

        {/* Status Indicator */}
        <div
          className={`p-4 text-center rounded-lg font-semibold transition-all duration-300 shadow-inner
                    ${
                      isRecording
                        ? "bg-red-100 text-red-600 ring-2 ring-red-300"
                        : isProcessing
                        ? "bg-indigo-100 text-indigo-600 ring-2 ring-indigo-300"
                        : audioUrl
                        ? "bg-green-100 text-green-600 ring-2 ring-green-300"
                        : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
                    }`}
        >
          <p className="flex items-center justify-center gap-2">
            {isRecording && <Mic className="w-5 h-5 animate-pulse" />}
            {isProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
            {status}
          </p>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center space-x-6">
          {/* Record Button */}
          <button
            onClick={startRecording}
            disabled={isRecording || isProcessing}
            className={`w-20 h-20 rounded-full shadow-xl transition-all duration-200 flex items-center justify-center 
                            ${
                              isRecording || isProcessing
                                ? "bg-gray-300 cursor-not-allowed"
                                : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white transform hover:scale-110"
                            }
                        `}
            title="Start Recording"
          >
            <Mic className="w-8 h-8" />
          </button>

          {/* Stop Button */}
          <button
            onClick={stopRecording}
            disabled={!isRecording}
            className={`w-20 h-20 rounded-full shadow-xl transition-all duration-200 flex items-center justify-center 
                            ${
                              !isRecording
                                ? "bg-gray-300 cursor-not-allowed"
                                : "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transform hover:scale-110"
                            }
                        `}
            title="Stop Recording"
          >
            <StopCircle className="w-8 h-8" />
          </button>

          {/* Play Button */}
          <button
            onClick={playAudio}
            disabled={!audioUrl || isRecording || isProcessing}
            className={`w-20 h-20 rounded-full shadow-xl transition-all duration-200 flex items-center justify-center 
                            ${
                              !audioUrl || isRecording || isProcessing
                                ? "bg-gray-300 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700 active:bg-green-800 text-white transform hover:scale-110"
                            }
                        `}
            title="Play Feedback"
          >
            <Volume2 className="w-8 h-8" />
          </button>
        </div>

        {/* Reset Button */}
        <div className="flex justify-center">
          <button
            onClick={resetApp}
            disabled={isRecording || isProcessing}
            className={`px-4 py-2 rounded-lg shadow transition-all duration-200 text-sm font-medium
                            ${
                              isRecording || isProcessing
                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }
                        `}
            title="Reset"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Reset
            </div>
          </button>
        </div>

        {/* Setup Instructions */}
        <div className="border-t pt-4 mt-4 text-sm text-gray-500">
          <h3 className="font-semibold text-gray-700 mb-2">Setup Required:</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              **Install Dependencies** (Flask, CORS, Google GenAI, etc.): `pip
              install flask flask-cors google-genai soundfile librosa numpy`
            </li>
            <li>
              **Set API Key:** Set your Gemini API key environment variable in
              the terminal: `export GOOGLE_API_KEY='your-key-here'`
            </li>
            <li>
              **Save Files:** Ensure `app.py` and `record_and_process.py` are in
              the **same directory**.
            </li>
            <li>
              **Start Flask:** Run the backend server first: `python app.py`
            </li>
            <li>
              **Run Frontend:** Open this React app. The React app will
              communicate with the Flask server running on
              `http://localhost:5000`.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default App;
