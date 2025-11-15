import subprocess
from pathlib import Path

file_path = Path(__file__).resolve().parent

subprocess.run(["./HelloWorld/venv/Scripts/python.exe", file_path / "get_audio_input.py"])

subprocess.run(["./HelloWorld/venv/Scripts/python.exe", file_path / "get_audio_response.py"])
