"""
Test script to verify the IoT device data update API endpoint works with device ID 0050101
"""
import requests
import json

# Configuration
API_BASE_URL = "https://smartcityapi.aiproduct.uz/api"

def test_iot_device_update():
    """Test the IoT device data update endpoint"""
    print("Testing IoT device data update endpoint...")
    
    # First, login to get authentication token
    login_data = {
        "login": "superadmin",
        "password": "123"
    }
    
    response = requests.post(f"{API_BASE_URL}/auth/login/", json=login_data)
    if response.status_code != 200:
        print(f"Login failed: {response.status_code} - {response.text}")
        return False
    
    token = response.json().get('token')
    if not token:
        print("No token received from login")
        return False
    
    print("Login successful, got token")
    
    # Test data for device ID 0050101
    test_data = {
        "device_id": "0050101",  # The device ID you mentioned
        "temperature": 22.5,     # Example temperature
        "humidity": 45.0,        # Example humidity
        "sleep_seconds": 2000,   # Example sleep time
        "timestamp": 1234567890  # Example timestamp
    }
    
    # Prepare headers with authentication
    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json'
    }
    
    # Send the data to the IoT device data endpoint
    response = requests.post(
        f"{API_BASE_URL}/iot-devices/data/update/",
        json=test_data,
        headers=headers
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ IoT device data update successful!")
        print(f"Device ID: {test_data['device_id']}")
        print(f"Temperature: {test_data['temperature']}°C")
        print(f"Humidity: {test_data['humidity']}%")
        print(f"Response: {result}")
        return True
    else:
        print(f"❌ IoT device data update failed: {response.status_code}")
        print(f"Response: {response.text}")
        return False

def test_get_iot_devices():
    """Test getting all IoT devices to see if our device exists"""
    print("\nTesting getting all IoT devices...")
    
    # Login first
    login_data = {
        "login": "superadmin",
        "password": "123"
    }
    
    response = requests.post(f"{API_BASE_URL}/auth/login/", json=login_data)
    if response.status_code != 200:
        print(f"Login failed: {response.status_code} - {response.text}")
        return False
    
    token = response.json().get('token')
    if not token:
        print("No token received from login")
        return False
    
    # Get all IoT devices
    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(f"{API_BASE_URL}/iot-devices/", headers=headers)
    
    if response.status_code == 200:
        devices = response.json()
        print(f"Found {len(devices)} IoT devices")
        
        # Look for device with ID containing "0050101" or similar
        matching_devices = [d for d in devices if "005" in d.get('device_id', '') or "50101" in d.get('device_id', '')]
        
        if matching_devices:
            print("Matching devices found:")
            for device in matching_devices:
                print(f"  - Device ID: {device.get('device_id')}")
                print(f"    Temperature: {device.get('current_temperature')}")
                print(f"    Humidity: {device.get('current_humidity')}")
        else:
            print("No devices with similar ID found in the system")
        
        return True
    else:
        print(f"Failed to get IoT devices: {response.status_code}")
        print(f"Response: {response.text}")
        return False

if __name__ == "__main__":
    print("Testing IoT device data update functionality...")
    
    # Run tests
    success1 = test_iot_device_update()
    success2 = test_get_iot_devices()
    
    if success1 and success2:
        print("\n✅ All tests completed successfully!")
        print("The IoT device data update API endpoint works correctly.")
        print("The system can update device data with device ID '0050101'.")
    else:
        print("\n❌ Some tests failed!")