import os
import time
from dotenv import load_dotenv
load_dotenv()

class APIKeyManager:
    def __init__(self):
        self.api_keys = []

        index = 1
        while True:
            key_name = f"GOOGLE_API_KEY{index}"
            key_value = os.getenv(key_name)
            if key_value:
                self.api_keys.append(key_value)
                index += 1
            else:
                break  

        if not self.api_keys:
            fallback_key = os.getenv("GOOGLE_API_KEY")
            if fallback_key:
                self.api_keys.append(fallback_key)

        if not self.api_keys:
            raise ValueError("❌ No valid Google API keys found in environment variables.")

        self.current_index = 0
        self.key_usage_count = {key: 0 for key in self.api_keys}
        self.key_errors = {key: 0 for key in self.api_keys}
        self.last_used = {key: 0 for key in self.api_keys}

        print(f"✅ Initialized API Key Manager with {len(self.api_keys)} keys")
    
    def get_next_key(self):
        """Get next API key using round-robin with error tracking"""
        current_time = time.time()
        
        best_key = None
        best_score = float('inf')
        
        for key in self.api_keys:
            if self.key_errors[key] > 10 and current_time - self.last_used[key] < 300:
                continue
            
            score = (
                self.key_usage_count[key] * 1.0 +  
                self.key_errors[key] * 2.0 +       
                max(0, 60 - (current_time - self.last_used[key])) * 0.1  
            )
            
            if score < best_score:
                best_score = score
                best_key = key
        
        if not best_key:
            best_key = self.api_keys[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.api_keys)
        
        self.key_usage_count[best_key] += 1
        self.last_used[best_key] = current_time
        
        return best_key
    
    def report_error(self, api_key):
        """Report an error for a specific API key"""
        if api_key in self.key_errors:
            self.key_errors[api_key] += 1
            print(f"⚠️ API Key error count for {api_key[-10:]}: {self.key_errors[api_key]}")
    
    def reset_error_counts(self):
        """Reset error counts (called periodically)"""
        self.key_errors = {key: max(0, count - 1) for key, count in self.key_errors.items()}