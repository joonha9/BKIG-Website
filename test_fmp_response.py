"""
FMP API 실제 응답 확인용 (디버깅).
프로젝트 루트에서: python test_fmp_response.py
.env 의 FMP_API_KEY 가 사용됩니다.
"""
import os
import json
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def main():
    api_key = os.getenv("FMP_API_KEY", "").strip()
    if not api_key:
        print("FMP_API_KEY not set in .env")
        return
    url = "https://financialmodelingprep.com/api/v3/quote/SPY"
    try:
        import requests
        r = requests.get(url, params={"apikey": api_key}, timeout=10)
        print("Status:", r.status_code)
        data = r.json()
        print("Response (first item keys and values):")
        if isinstance(data, list) and data:
            for k, v in data[0].items():
                print(f"  {k!r}: {v!r}")
        else:
            print(json.dumps(data, indent=2)[:1500])
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
