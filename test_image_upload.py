"""
Test script to verify the image upload functionality for WasteBin objects.
This script tests the new image upload endpoint.
"""
import os
import requests
import tempfile
from PIL import Image

# Configuration
API_BASE_URL = "https://smartcityapi.aiproduct.uz/api"
TEST_IMAGE_PATH = "test_waste_bin.jpg"

def create_test_image():
    """Create a simple test image"""
    img = Image.new('RGB', (100, 100), color='green')
    img.save(TEST_IMAGE_PATH)
    print(f"Created test image: {TEST_IMAGE_PATH}")

def test_image_upload():
    """Test the image upload functionality"""
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
    
    # Get a waste bin to test with
    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(f"{API_BASE_URL}/waste-bins/", headers=headers)
    if response.status_code != 200:
        print(f"Failed to get waste bins: {response.status_code}")
        return False
    
    bins = response.json()
    if not bins:
        print("No waste bins found to test with")
        return False
    
    test_bin_id = bins[0]['id']
    print(f"Testing with waste bin ID: {test_bin_id}")
    
    # Test the new image upload endpoint
    headers = {
        'Authorization': f'Token {token}'
    }
    
    with open(TEST_IMAGE_PATH, 'rb') as img_file:
        files = {
            'image': (TEST_IMAGE_PATH, img_file, 'image/jpeg')
        }
        
        data = {
            'is_full': False,
            'fill_level': 50,
            'image_source': 'TEST',
            'last_analysis': 'Test image upload'
        }
        
        response = requests.patch(
            f"{API_BASE_URL}/waste-bins/{test_bin_id}/update-image-file/",
            files=files,
            data=data,
            headers=headers
        )
    
    if response.status_code in [200, 201]:
        result = response.json()
        print(f"Image upload successful!")
        print(f"Updated bin: {result.get('address', 'Unknown address')}")
        print(f"Image field: {result.get('image', 'No image field')}")
        print(f"Image source: {result.get('image_source', 'Unknown')}")
        return True
    else:
        print(f"Image upload failed: {response.status_code} - {response.text}")
        return False

if __name__ == "__main__":
    print("Testing image upload functionality...")
    
    # Create test image
    create_test_image()
    
    # Run test
    success = test_image_upload()
    
    # Cleanup
    if os.path.exists(TEST_IMAGE_PATH):
        os.remove(TEST_IMAGE_PATH)
        print(f"Cleaned up test image: {TEST_IMAGE_PATH}")
    
    if success:
        print("\n✅ Test completed successfully!")
    else:
        print("\n❌ Test failed!")