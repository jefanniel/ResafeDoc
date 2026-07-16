from google import genai

client = genai.Client(api_key="AIzaSyCEF6KCj_koo0Xux3dJi0OHYSzgfx6hzOs")
response = client.models.generate_content(
    model="gemma-4-26b-a4b-it ",
    contents="Say halo in indonesia"
)
print(response.text)