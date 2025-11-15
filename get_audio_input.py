import pyaudio
import wave
import time
import os
import sys
from pathlib import Path

# --- Configuration ---
CHUNK = 1024 
FORMAT = pyaudio.paInt16 # 16-bit encoding
CHANNELS = 1 
RATE = 44100 
RECORD_SECONDS = 5 

# Path to the script's current directory
# This correctly resolves the path even when run from a different directory
SCRIPT_DIR = Path(__file__).resolve().parent

# Define the absolute output path using the script's directory
OUTPUT_FILENAME = SCRIPT_DIR / "mic_recording.wav"

def record_and_save_audio(duration: int):
    """
    Records audio from the default microphone for a given duration 
    and saves it to the OUTPUT_FILENAME path.
    """
    print("--- Audio Recorder Initialized ---")
    
    # 1. Initialize PyAudio
    audio = pyaudio.PyAudio()

    # 2. Open an audio stream
    try:
        stream = audio.open(format=FORMAT,
                            channels=CHANNELS,
                            rate=RATE,
                            input=True,
                            frames_per_buffer=CHUNK)
    except OSError as e:
        print("\nERROR: Could not open audio stream. Check mic connection/permissions.")
        print(f"Underlying error: {e}")
        audio.terminate()
        sys.exit(1)


    print(f"\nRecording started for {duration} seconds... (Press Ctrl+C to stop early)")
    frames = []

    # 3. Read audio data in chunks
    try:
        for i in range(0, int(RATE / CHUNK * duration)):
            data = stream.read(CHUNK)
            frames.append(data)
            
            # Simple console progress indicator
            if (i % (RATE / CHUNK // 2)) == 0:
                sys.stdout.write('.')
                sys.stdout.flush()

        print("\nRecording finished.")

    except KeyboardInterrupt:
        print("\nRecording stopped by user.")
    except Exception as e:
        print(f"\nAn error occurred during recording: {e}")
    finally:
        # 4. Stop and close the stream
        # Check if stream exists and is active before trying to stop/close
        if 'stream' in locals() and stream.is_active():
             stream.stop_stream()
             stream.close()
        
        # 5. Terminate the PyAudio object
        audio.terminate()

    # 6. Write the recorded frames to a WAV file
    # We use str(OUTPUT_FILENAME) to guarantee compatibility with the wave module
    print(f"Saving to {OUTPUT_FILENAME}...")
    try:
        with wave.open(str(OUTPUT_FILENAME), 'wb') as wf:
            wf.setnchannels(CHANNELS)
            wf.setsampwidth(audio.get_sample_size(FORMAT))
            wf.setframerate(RATE)
            wf.writeframes(b''.join(frames))
            
        print(f"Success! Audio saved as: {OUTPUT_FILENAME.resolve()}")
        print(f"Recorded duration: {len(frames) * CHUNK / RATE:.2f} seconds.")

    except Exception as e:
        # This catch block is dedicated to file writing issues (e.g., permissions)
        print(f"Failed to save WAV file. Check directory permissions or disk space.")
        print(f"File Path attempted: {OUTPUT_FILENAME.resolve()}")
        print(f"Underlying error: {e}")

if __name__ == "__main__":
    record_and_save_audio(RECORD_SECONDS)
