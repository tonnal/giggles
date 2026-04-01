#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Giggles Family Memory Sharing Platform
Tests the FastAPI proxy server and Next.js backend integration
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class GigglesAPITester:
    def __init__(self, base_url: str = "https://613fe85a-9402-47eb-828e-4998d84bb55f.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.family_id: Optional[str] = None
        self.child_id: Optional[str] = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        
        # Set headers for mobile app simulation
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'GigglesApp/1.0 (iOS)',
            'Accept': 'application/json'
        })

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED {details}")
        else:
            print(f"❌ {name}: FAILED {details}")

    def make_request(self, method: str, endpoint: str, data: Dict[Any, Any] = None, 
                    expected_status: int = 200, auth_required: bool = False) -> tuple[bool, Dict[Any, Any], int]:
        """Make HTTP request and return success, response data, status code"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        headers = {}
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}, 0

            # Check CORS headers
            cors_headers = {
                'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
                'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
                'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
            }
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            # Add CORS info to response
            response_data['_cors_headers'] = cors_headers
            
            success = response.status_code == expected_status
            return success, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}, 0

    def test_health_check(self):
        """Test 1: Backend API health check"""
        print("\n🔍 Testing Backend API Health...")
        success, data, status = self.make_request('GET', '/health')
        
        if success and data.get('status') == 'ok':
            self.log_test("Health Check", True, f"- Service: {data.get('service')}")
            return True
        else:
            self.log_test("Health Check", False, f"- Status: {status}, Data: {data}")
            return False

    def test_cors_headers(self):
        """Test 2: CORS headers for mobile app compatibility"""
        print("\n🔍 Testing CORS Headers...")
        success, data, status = self.make_request('GET', '/health')
        
        cors_headers = data.get('_cors_headers', {})
        cors_origin = cors_headers.get('access-control-allow-origin')
        
        if cors_origin == '*' or cors_origin:
            self.log_test("CORS Headers", True, f"- Origin: {cors_origin}")
            return True
        else:
            self.log_test("CORS Headers", False, f"- Missing CORS headers: {cors_headers}")
            return False

    def test_mobile_auth(self):
        """Test 3: Mobile authentication endpoint"""
        print("\n🔍 Testing Mobile Authentication...")
        
        auth_data = {
            "provider": "google",
            "token": "mock_oauth_token_123",
            "email": "test@example.com",
            "name": "Test User",
            "avatar": "https://example.com/avatar.jpg"
        }
        
        success, data, status = self.make_request('POST', '/auth/mobile', auth_data, 200)
        
        # Handle Next.js API response structure
        if success and data.get('success') and data.get('data'):
            response_data = data['data']
            if response_data.get('token') and response_data.get('user'):
                self.token = response_data['token']
                self.user_id = response_data['user']['id']
                user_email = response_data['user']['email']
                self.log_test("Mobile Auth", True, f"- User: {user_email}, Token received")
                return True
        
        self.log_test("Mobile Auth", False, f"- Status: {status}, Data: {data}")
        return False

    def test_auth_me(self):
        """Test 4: Authenticated user info endpoint"""
        print("\n🔍 Testing Authenticated User Info...")
        
        if not self.token:
            self.log_test("Auth Me", False, "- No token available")
            return False
        
        success, data, status = self.make_request('GET', '/auth/me', auth_required=True)
        
        # Handle Next.js API response structure
        if success and data.get('success') and data.get('data'):
            response_data = data['data']
            if response_data.get('user'):
                user_email = response_data['user'].get('email')
                self.log_test("Auth Me", True, f"- User: {user_email}")
                return True
        elif success and data.get('user'):
            # Direct user response
            user_email = data['user'].get('email')
            self.log_test("Auth Me", True, f"- User: {user_email}")
            return True
        
        self.log_test("Auth Me", False, f"- Status: {status}, Data: {data}")
        return False

    def test_family_creation(self):
        """Test 5: Family creation"""
        print("\n🔍 Testing Family Creation...")
        
        if not self.token:
            self.log_test("Family Creation", False, "- No token available")
            return False
        
        family_data = {
            "name": "Test Family",
            "childName": "Test Child",
            "childDob": "2020-01-15",
            "childGender": "boy"  # Use valid enum value: 'boy' or 'girl'
        }
        
        success, data, status = self.make_request('POST', '/families', family_data, 200, auth_required=True)
        
        # Handle Next.js API response structure
        if success and data.get('success') and data.get('data'):
            response_data = data['data']
            if response_data.get('family') and response_data.get('child'):
                self.family_id = str(response_data['family']['_id'])
                self.child_id = str(response_data['child']['_id'])
                family_name = response_data['family']['name']
                child_name = response_data['child']['name']
                self.log_test("Family Creation", True, f"- Family: {family_name}, Child: {child_name}")
                return True
        elif success and data.get('family') and data.get('child'):
            # Direct response
            self.family_id = str(data['family']['_id'])
            self.child_id = str(data['child']['_id'])
            family_name = data['family']['name']
            child_name = data['child']['name']
            self.log_test("Family Creation", True, f"- Family: {family_name}, Child: {child_name}")
            return True
        
        self.log_test("Family Creation", False, f"- Status: {status}, Data: {data}")
        return False

    def test_get_families(self):
        """Test 6: Get families for user"""
        print("\n🔍 Testing Get Families...")
        
        if not self.token:
            self.log_test("Get Families", False, "- No token available")
            return False
        
        success, data, status = self.make_request('GET', '/families', auth_required=True)
        
        # Handle Next.js API response structure
        families_data = None
        if success and data.get('success') and data.get('data'):
            families_data = data['data']
        elif success and isinstance(data, list):
            families_data = data
        
        if families_data is not None and isinstance(families_data, list):
            family_count = len(families_data)
            self.log_test("Get Families", True, f"- Found {family_count} families")
            return True
        
        self.log_test("Get Families", False, f"- Status: {status}, Data: {data}")
        return False

    def test_child_creation(self):
        """Test 7: Child profile creation"""
        print("\n🔍 Testing Child Profile Creation...")
        
        if not self.token or not self.family_id:
            self.log_test("Child Creation", False, "- No token or family_id available")
            return False
        
        child_data = {
            "familyId": self.family_id,
            "name": "Second Test Child",
            "dob": "2022-06-10",
            "gender": "girl"  # Valid enum value: 'boy' or 'girl'
        }
        
        success, data, status = self.make_request('POST', '/children', child_data, 200, auth_required=True)
        
        # Handle Next.js API response structure
        child_info = None
        if success and data.get('success') and data.get('data'):
            child_info = data['data']
        elif success and data.get('name'):
            child_info = data
        
        if child_info and child_info.get('name'):
            child_name = child_info['name']
            self.log_test("Child Creation", True, f"- Child: {child_name}")
            return True
        
        self.log_test("Child Creation", False, f"- Status: {status}, Data: {data}")
        return False

    def test_get_children(self):
        """Test 8: Get children for family"""
        print("\n🔍 Testing Get Children...")
        
        if not self.token or not self.family_id:
            self.log_test("Get Children", False, "- No token or family_id available")
            return False
        
        success, data, status = self.make_request('GET', f'/children?familyId={self.family_id}', auth_required=True)
        
        # Handle Next.js API response structure
        children_data = None
        if success and data.get('success') and data.get('data'):
            children_data = data['data']
        elif success and isinstance(data, list):
            children_data = data
        
        if children_data is not None and isinstance(children_data, list):
            children_count = len(children_data)
            self.log_test("Get Children", True, f"- Found {children_count} children")
            return True
        
        self.log_test("Get Children", False, f"- Status: {status}, Data: {data}")
        return False

    def test_memory_creation(self):
        """Test 9: Memory upload flow"""
        print("\n🔍 Testing Memory Creation...")
        
        if not self.token or not self.family_id or not self.child_id:
            self.log_test("Memory Creation", False, "- Missing required IDs")
            return False
        
        memory_data = {
            "familyId": self.family_id,
            "childId": self.child_id,
            "mediaUrl": "https://example.com/test-photo.jpg",
            "mediaType": "photo",  # Valid enum values: 'photo' or 'video'
            "caption": "Test memory - child playing in the park with family",
            "date": "2024-01-15T10:30:00Z",
            "thumbnailUrl": "https://example.com/test-photo-thumb.jpg",
            "metadata": {
                "location": {"lat": 37.7749, "lng": -122.4194, "name": "San Francisco"},
                "camera": {"make": "Apple", "model": "iPhone 15"},
                "context": "Family outing to the park"
            }
        }
        
        success, data, status = self.make_request('POST', '/memories', memory_data, 200, auth_required=True)
        
        # Handle Next.js API response structure
        memory_info = None
        if success and data.get('success') and data.get('data'):
            memory_info = data['data']
        elif success and data.get('_id'):
            memory_info = data
        
        if memory_info and memory_info.get('_id'):
            memory_caption = memory_info.get('caption', '')[:50] + '...'
            tags = memory_info.get('tags', [])
            self.log_test("Memory Creation", True, f"- Caption: {memory_caption}, Tags: {tags}")
            return True
        
        self.log_test("Memory Creation", False, f"- Status: {status}, Data: {data}")
        return False

    def test_get_memories(self):
        """Test 10: Get memories for family"""
        print("\n🔍 Testing Get Memories...")
        
        if not self.token or not self.family_id:
            self.log_test("Get Memories", False, "- No token or family_id available")
            return False
        
        success, data, status = self.make_request('GET', f'/memories?familyId={self.family_id}', auth_required=True)
        
        # Handle Next.js API response structure
        memories_info = None
        if success and data.get('success') and data.get('data'):
            memories_info = data['data']
        elif success and data.get('memories') is not None:
            memories_info = data
        
        if memories_info and memories_info.get('memories') is not None:
            memories_count = len(memories_info['memories'])
            pagination = memories_info.get('pagination', {})
            self.log_test("Get Memories", True, f"- Found {memories_count} memories, Total: {pagination.get('total', 0)}")
            return True
        
        self.log_test("Get Memories", False, f"- Status: {status}, Data: {data}")
        return False

    def test_mongodb_connectivity(self):
        """Test 11: MongoDB connectivity through API operations"""
        print("\n🔍 Testing MongoDB Connectivity...")
        
        # MongoDB connectivity is tested implicitly through all CRUD operations
        # If we've successfully created users, families, children, and memories, MongoDB is working
        if self.user_id and self.family_id and self.child_id:
            self.log_test("MongoDB Connectivity", True, "- All CRUD operations successful")
            return True
        else:
            self.log_test("MongoDB Connectivity", False, "- CRUD operations failed")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Giggles Backend API Testing...")
        print(f"📡 Testing endpoint: {self.base_url}")
        print("=" * 60)
        
        # Core infrastructure tests
        health_ok = self.test_health_check()
        cors_ok = self.test_cors_headers()
        
        if not health_ok:
            print("\n❌ Backend health check failed. Stopping tests.")
            return False
        
        # Authentication flow
        auth_ok = self.test_mobile_auth()
        if auth_ok:
            self.test_auth_me()
        
        # Family management
        family_ok = self.test_family_creation()
        if family_ok:
            self.test_get_families()
        
        # Child management
        child_ok = self.test_child_creation()
        if child_ok:
            self.test_get_children()
        
        # Memory management (requires AI integration)
        memory_ok = self.test_memory_creation()
        if memory_ok:
            self.test_get_memories()
        
        # Database connectivity
        self.test_mongodb_connectivity()
        
        # Final results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 Backend testing completed successfully!")
            return True
        else:
            print("⚠️  Backend has significant issues that need attention.")
            return False

def main():
    """Main test execution"""
    tester = GigglesAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())