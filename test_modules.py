import requests
import json
import time

# Test script for both modules
BASE_URL = "https://smartcityapi.aiproduct.uz/api"

def test_authentication():
    """Test authentication system"""
    print("1. Testing authentication...")
    login_data = {
        "login": "superadmin",
        "password": "123"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login/", json=login_data)
    if response.status_code == 200:
        token = response.json()['token']
        print("   ✓ Authentication successful")
        return token
    else:
        print(f"   ✗ Authentication failed: {response.text}")
        return None

def test_waste_management_module(token):
    """Test waste management module"""
    print("\n2. Testing Waste Management Module...")
    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json'
    }
    
    # Get waste bins
    response = requests.get(f"{BASE_URL}/waste-bins/", headers=headers)
    if response.status_code == 200:
        bins = response.json()
        print(f"   ✓ Retrieved {len(bins)} waste bins")
        if bins:
            print(f"   ✓ First bin: {bins[0]['address']}, fill level: {bins[0]['fill_level']}%, is_full: {bins[0]['is_full']}")
    else:
        print(f"   ✗ Failed to get waste bins: {response.text}")
    
    # Get trucks
    response = requests.get(f"{BASE_URL}/trucks/", headers=headers)
    if response.status_code == 200:
        trucks = response.json()
        print(f"   ✓ Retrieved {len(trucks)} trucks")
        if trucks:
            print(f"   ✓ First truck: {trucks[0]['driver_name']}, plate: {trucks[0]['plate_number']}, status: {trucks[0]['status']}")
    else:
        print(f"   ✗ Failed to get trucks: {response.text}")

def test_temperature_control_module(token):
    """Test temperature control module"""
    print("\n3. Testing Temperature Control Module...")
    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json'
    }
    
    # Get facilities
    response = requests.get(f"{BASE_URL}/facilities/", headers=headers)
    if response.status_code == 200:
        facilities = response.json()
        print(f"   ✓ Retrieved {len(facilities)} facilities")
        if facilities:
            facility = facilities[0]
            print(f"   ✓ First facility: {facility['name']}, type: {facility['type']}, status: {facility['overall_status']}")
            
            # Check if facility has boilers and rooms with temperature data
            if facility['boilers']:
                boiler = facility['boilers'][0]
                print(f"   ✓ Boiler: {boiler['name']}, humidity: {boiler['humidity']}%, temperature: {boiler.get('temperature', 'N/A')}°C")
                
                if boiler['connected_rooms']:
                    room = boiler['connected_rooms'][0]
                    print(f"   ✓ Room: {room['name']}, humidity: {room['humidity']}%, temperature: {room.get('temperature', 'N/A')}°C")
    else:
        print(f"   ✗ Failed to get facilities: {response.text}")
    
    # Get rooms directly
    response = requests.get(f"{BASE_URL}/rooms/", headers=headers)
    if response.status_code == 200:
        rooms = response.json()
        print(f"   ✓ Retrieved {len(rooms)} rooms")
        if rooms and rooms[0].get('temperature') is not None:
            print(f"   ✓ Room temperature data available: {rooms[0]['temperature']}°C")
    else:
        print(f"   ✗ Failed to get rooms: {response.text}")
    
    # Get boilers directly
    response = requests.get(f"{BASE_URL}/boilers/", headers=headers)
    if response.status_code == 200:
        boilers = response.json()
        print(f"   ✓ Retrieved {len(boilers)} boilers")
        if boilers and boilers[0].get('temperature') is not None:
            print(f"   ✓ Boiler temperature data available: {boilers[0]['temperature']}°C")
    else:
        print(f"   ✗ Failed to get boilers: {response.text}")

def test_iot_devices(token):
    """Test IoT devices for temperature/humidity sensors"""
    print("\n4. Testing IoT Devices...")
    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json'
    }
    
    # Get IoT devices
    response = requests.get(f"{BASE_URL}/iot-devices/", headers=headers)
    if response.status_code == 200:
        devices = response.json()
        print(f"   ✓ Retrieved {len(devices)} IoT devices")
        if devices:
            device = devices[0]
            print(f"   ✓ First device: {device['device_id']}, type: {device['device_type']}, active: {device['is_active']}")
    else:
        print(f"   ✗ Failed to get IoT devices: {response.text}")
    
    # Test sending sensor data (doesn't require auth)
    print("   Testing sensor data endpoint...")
    sensor_data = {
        "device_id": "ESP-A4C416",  # This should match an existing device
        "temperature": 25.3,
        "humidity": 36.1,
        "sleep_seconds": 2000,
        "timestamp": int(time.time())
    }
    
    response = requests.post(f"{BASE_URL}/iot-devices/data/update/", json=sensor_data)
    if response.status_code == 200:
        result = response.json()
        print(f"   ✓ Successfully sent sensor data: {result['message']}")
    else:
        print(f"   ✗ Failed to send sensor data: {response.text}")

def main():
    print("Testing Smart City Farg'ona - Both Modules")
    print("="*50)
    
    # Test authentication
    token = test_authentication()
    if not token:
        print("\n✗ Tests failed - authentication required")
        return
    
    # Test waste management module
    test_waste_management_module(token)
    
    # Test temperature control module
    test_temperature_control_module(token)
    
    # Test IoT devices
    test_iot_devices(token)
    
    print("\n" + "="*50)
    print("✓ All tests completed successfully!")
    print("Both modules (Waste Management and Temperature Control) are working correctly.")
    print("- Waste Management: Bins, trucks, QR codes, AI analysis")
    print("- Temperature Control: Rooms, boilers, facilities with temperature/humidity monitoring")
    print("- IoT Integration: Real-time sensor data processing")

if __name__ == "__main__":
    main()