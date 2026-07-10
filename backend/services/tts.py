import os
import io
import wave
from typing import Optional
from piper.voice import PiperVoice

_voice: Optional[PiperVoice] = None
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "en_US-lessac-medium.onnx")

def get_voice() -> PiperVoice:
    global _voice
    if _voice is None:
        # Resolve path relative to backend folder
        resolved_path = os.path.abspath(MODEL_PATH)
        if not os.path.exists(resolved_path):
            # Try absolute backup path
            backup_path = r"c:\Users\ASUS\Documents\projects\interview\backend\models\en_US-lessac-medium.onnx"
            if os.path.exists(backup_path):
                resolved_path = backup_path
            else:
                raise FileNotFoundError(f"Piper model not found at {resolved_path}")
        _voice = PiperVoice.load(resolved_path)
    return _voice

def generate_speech(text: str) -> bytes:
    voice = get_voice()
    buffer = io.BytesIO()
    wav_file = wave.open(buffer, "wb")
    voice.synthesize_wav(text, wav_file)
    wav_file.close()
    return buffer.getvalue()
