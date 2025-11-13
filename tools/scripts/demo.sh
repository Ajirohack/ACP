#!/bin/bash
# Android Virtual OS Control Plane Demo Script
# This script demonstrates the key features of the control plane

# Colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Android Virtual OS Control Plane Demo ===${NC}\n"

# Check if services are running
echo -e "${YELLOW}Checking if required services are running...${NC}"
curl -s http://localhost:3002/health > /dev/null && echo -e "${GREEN}✓ Instance Manager is running${NC}" || echo -e "\033[0;31m✗ Instance Manager is not running${NC}"
curl -s http://localhost:3001/health > /dev/null && echo -e "${GREEN}✓ Gateway is running${NC}" || echo -e "\033[0;31m✗ Gateway is not running${NC}"
curl -s http://localhost:3003/health > /dev/null && echo -e "${GREEN}✓ Orchestrator is running${NC}" || echo -e "\033[0;31m✗ Orchestrator is not running${NC}"
curl -s http://localhost:4001/health > /dev/null && echo -e "${GREEN}✓ Host Adapter is running${NC}" || echo -e "\033[0;31m✗ Host Adapter is not running${NC}"

echo -e "\n${YELLOW}1. Listing available instances${NC}"
INSTANCES=$(curl -s http://localhost:3001/instances)
echo $INSTANCES | jq '.'

echo -e "\n${YELLOW}2. Starting a new emulator instance${NC}"
echo "Starting emulator with AVD 'Pixel_6_API_33'..."
START_RESPONSE=$(curl -s -X POST http://localhost:3001/instances/start -H "Content-Type: application/json" -d '{"avdName": "Pixel_6_API_33"}')
echo $START_RESPONSE | jq '.'
INSTANCE_ID=$(echo $START_RESPONSE | jq -r '.instanceId')

echo -e "\n${YELLOW}3. Waiting for instance to boot (30 seconds)${NC}"
for i in {1..30}; do
  echo -n "."
  sleep 1
done
echo -e "\n"

echo -e "${YELLOW}4. Checking instance status${NC}"
curl -s http://localhost:3001/instances/$INSTANCE_ID | jq '.'

echo -e "\n${YELLOW}5. Executing a shell command on the instance${NC}"
echo "Running 'getprop ro.build.version.release' to get Android version..."
SHELL_RESPONSE=$(curl -s -X POST http://localhost:3001/instances/$INSTANCE_ID/shell -H "Content-Type: application/json" -d '{"command": "getprop ro.build.version.release"}')
echo $SHELL_RESPONSE | jq '.'

echo -e "\n${YELLOW}6. Taking a screenshot${NC}"
echo "Capturing screenshot from the emulator..."
SCREENSHOT_RESPONSE=$(curl -s -X POST http://localhost:3001/instances/$INSTANCE_ID/screenshot -H "Content-Type: application/json" -d '{}')
echo "Screenshot saved to: $(echo $SCREENSHOT_RESPONSE | jq -r '.path')"

echo -e "\n${YELLOW}7. Launching Settings app${NC}"
LAUNCH_RESPONSE=$(curl -s -X POST http://localhost:3001/instances/$INSTANCE_ID/launch -H "Content-Type: application/json" -d '{"packageName": "com.android.settings", "activityName": ".Settings"}')
echo $LAUNCH_RESPONSE | jq '.'

echo -e "\n${YELLOW}8. Running an orchestration workflow${NC}"
echo "Executing the 'app-launch-workflow'..."
WORKFLOW_RESPONSE=$(curl -s -X POST http://localhost:3003/workflows/app-launch-workflow/execute -H "Content-Type: application/json" -d "{\"instanceId\": \"$INSTANCE_ID\", \"params\": {\"packageName\": \"com.android.settings\"}}")
echo $WORKFLOW_RESPONSE | jq '.'

echo -e "\n${YELLOW}9. Stopping the instance${NC}"
STOP_RESPONSE=$(curl -s -X POST http://localhost:3001/instances/$INSTANCE_ID/stop -H "Content-Type: application/json" -d '{}')
echo $STOP_RESPONSE | jq '.'

echo -e "\n${GREEN}Demo completed successfully!${NC}"
echo -e "You can access the web dashboard at: ${BLUE}http://localhost:7000${NC}"