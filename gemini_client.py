from google import genai
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def get_api_key():
    """Retrieves the Gemini API key from environment variables or prompts the user."""
    # Check for environment variable first
    env_key = os.environ.get("GEMINI_API_KEY")
    if env_key and env_key != "YOUR_API_KEY_HERE":
        # Check if it's the placeholder
        return env_key
        
    api_key = input("Enter your Gemini API key: ").strip()
    if not api_key:
        print("API key cannot be empty.")
        return None
    return api_key

def generate_content_genai(client, prompt, model_name="gemini-3-flash-preview"):
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt
        )
        return response.text
    except Exception as e:
        return f"Error generating content: {e}"

def main():
    print("--- Gemini API Client (using google-genai) ---")
    api_key = get_api_key()
    if not api_key:
        return

    # Initialize Client
    try:
        client = genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Failed to initialize client: {e}")
        return

    # User specified model
    model_name = "gemini-3-flash-preview"
    
    # Allow user to input prompt
    while True:
        user_prompt = input("\nEnter your prompt (or 'quit' to exit): ")
        if user_prompt.lower() in ['quit', 'exit']:
            break
        
        print(f"\nGenerating response using {model_name}...")
        response = generate_content_genai(client, user_prompt, model_name)
        print("\nResponse:")
        print(response)

if __name__ == "__main__":
    main()
