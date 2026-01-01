import requests
import json
import uuid

# Test the add truck/driver endpoint
BASE_URL = "https://smartcityapi.aiproduct.uz/api"

def run_test():
    """
    Tests creating a new truck (driver).
    """
    # 1. Authenticate to get a token
    try:
        login_data = {"login": "superadmin", "password": "123"}
        response = requests.post(f"{BASE_URL}/auth/login/", json=login_data)
        response.raise_for_status()
        token = response.json().get('token')
        if not token:
            print("❌ Test Failed: Could not get auth token.")
            return
        print("✅ Authenticated successfully.")
    except requests.exceptions.RequestException as e:
        print(f"❌ Test Failed: Authentication request failed: {e}")
        return

    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json'
    }

    # 2. Get an organization ID
    try:
        response = requests.get(f"{BASE_URL}/organizations/", headers=headers)
        response.raise_for_status()
        organizations = response.json()
        if not organizations:
            print("❌ Test Failed: No organizations found to assign the driver to.")
            return
        org_id = organizations[0]['id']
        print(f"✅ Found organization to use: {organizations[0]['name']} ({org_id})")
    except requests.exceptions.RequestException as e:
        print(f"❌ Test Failed: Could not get organizations: {e}")
        return

    # 3. Prepare and send the POST request to create a driver
    driver_login = f"test_driver_{uuid.uuid4().hex[:8]}"
    driver_data = {
        "driver_name": "Test Driver",
        "plate_number": "00 TEST 000",
        "phone": "+998901234567",
        "toza_hudud": "1-sonli Toza Hudud",
        "location": {
            "lat": 41.2995,
            "lng": 69.2401
        },
        "status": "IDLE",
        "fuel_level": 95,
        "login": driver_login,
        "password": "testpassword",
        "organization": org_id
    }

    print(f"\nAttempting to create driver '{driver_data['driver_name']}' with login '{driver_login}'...")

    try:
        response = requests.post(f"{BASE_URL}/trucks/", headers=headers, json=driver_data)
        
        # 4. Check the result
        if response.status_code == 201:
            print(f"✅ SUCCESS: Driver created successfully (Status: {response.status_code})")
            created_driver = response.json()
            print("   Response:", json.dumps(created_driver, indent=2))
            
            # 5. (Optional) Verify the driver was created by GET request
            try:
                verify_response = requests.get(f"{BASE_URL}/trucks/{created_driver['id']}/", headers=headers)
                if verify_response.status_code == 200:
                    print("✅ Verification SUCCESS: Found created driver via GET request.")
                else:
                    print(f"⚠️ Verification WARNING: Could not retrieve created driver. Status: {verify_response.status_code}")
            except requests.exceptions.RequestException as e:
                 print(f"⚠️ Verification WARNING: Request to verify driver failed: {e}")

        else:
            print(f"❌ Test Failed: Failed to create driver (Status: {response.status_code})")
            try:
                print("   Error response:", response.json())
            except json.JSONDecodeError:
                print("   Error response (not JSON):", response.text)

    except requests.exceptions.RequestException as e:
        print(f"❌ Test Failed: Request to create driver failed: {e}")


if __name__ == "__main__":
    run_test()
