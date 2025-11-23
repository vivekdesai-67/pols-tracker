# Speed Monitor Feature Guide

## Overview
The Speed Monitor is a real-time dashboard feature that tracks and displays vehicles approaching or exceeding safe speed limits.

## Accessing the Speed Monitor

### Step 1: Login as Admin
- Use admin credentials to access the dashboard
- You'll see the main fleet overview with map

### Step 2: Check the Speeding Card
Located in the top header, you'll see a "Speeding" card that shows:
- **Number**: Count of vehicles traveling ≥95 km/h
- **Color**: 
  - Gray background = No violations
  - Red background with pulse = Active violations
- **Interactive**: Click to toggle the Speed Violations Panel

### Step 3: Open Speed Violations Panel
Click the "Speeding" card to open a detailed panel showing:

## Speed Violations Panel Features

### Header Section
- **Title**: "Speed Monitor" with gauge icon
- **Description**: Shows speed limit (100 km/h max)

### Stats Summary
Three categories displayed:
1. **≥95 km/h** (Red) - Critical, near speed limit
2. **80-94 km/h** (Orange) - High speed, monitor closely  
3. **<80 km/h** (Green) - Normal, safe speeds

### Vehicle List
**Critical Section (≥95 km/h)**
- Red background with warning icon
- Shows driver name and current speed
- Displays distance from speed limit
- Click to view full vehicle details

**High Speed Section (80-94 km/h)**
- Orange background
- Shows driver name and current speed
- Click to view full vehicle details

**All Clear State**
- Green checkmark icon
- "All Clear!" message when no violations

### Footer
- Shows speed limit: 100 km/h
- Live indicator (pulsing green dot)

## Visual Indicators on Map

### Vehicle Markers
When a vehicle speeds (≥95 km/h):
1. **Red pulsing badge** appears above the truck icon
2. Badge shows: "⚠️ [speed] km/h"
3. Animates with pulse effect for attention
4. Vehicle label turns red when selected

### Detail Panel
Click any speeding vehicle to see:
- Speed display in red
- "⚠️ Near speed limit!" warning
- Dedicated warning section with explanation
- Current speed vs required speed comparison

## How It Works

### Real-Time Updates
- Updates every 4 seconds with GPS simulation
- Automatically adds/removes vehicles from list
- Sorts by speed (highest first)
- Live count in header card

### Speed Categories
```
0-79 km/h    → Normal (Green)
80-94 km/h   → High Speed (Orange) 
95-99 km/h   → Critical (Red, pulsing)
100 km/h     → Hard limit (capped)
```

### Demo Mode
The system occasionally simulates highway speeds (2% chance):
- Vehicles may reach 85-98 km/h
- Showcases the speed monitoring system
- Demonstrates warning indicators
- Console logs: "🏎️ [vehicle] entering highway"

## Use Cases

### Fleet Manager
1. Monitor all vehicles in real-time
2. Identify speeding drivers immediately
3. Click to contact driver or view details
4. Track speed violations over time

### Safety Compliance
1. Ensure all drivers follow speed limits
2. Quick visual identification of violations
3. Proactive intervention before accidents
4. Documentation for safety reports

### Performance Monitoring
1. Compare driver speeds
2. Identify aggressive driving patterns
3. Optimize routes for safety
4. Training opportunities for drivers

## Tips

### Best Practices
- Keep Speed Monitor open during peak hours
- Check regularly for red indicators
- Click vehicles for detailed information
- Use with Detail Panel for full context

### Keyboard Shortcuts
- Click "Speeding" card to toggle panel
- Click vehicle in list to select on map
- ESC key closes Detail Panel

### Mobile/Responsive
- Panel adapts to screen size
- Scrollable list for many vehicles
- Touch-friendly buttons
- Optimized for tablets

## Troubleshooting

### No vehicles showing in panel
- Check if any vehicles are ≥80 km/h
- Wait for GPS updates (every 4 seconds)
- Verify vehicles are active on map

### Panel not opening
- Ensure you're logged in as admin
- Click the "Speeding" card in header
- Check browser console for errors

### Speed seems incorrect
- Speeds are simulated for demo
- Updates every 4 seconds
- May vary due to traffic simulation
- Check Detail Panel for accurate reading

## Technical Details

### Component: SpeedViolationsPanel
- Location: `src/components/SpeedViolationsPanel.tsx`
- Props: vehicles array, onVehicleClick callback
- State: Filters and sorts vehicles by speed
- Styling: Tailwind CSS with custom animations

### Integration Points
1. **App.tsx**: Toggle state and rendering
2. **GPS Simulation**: Speed calculations
3. **Vehicle Store**: Real-time vehicle data
4. **Map Component**: Visual indicators

### Performance
- Efficient filtering (O(n) complexity)
- Memoized calculations
- Minimal re-renders
- Smooth animations

## Future Enhancements

Potential additions:
- Speed violation history/logs
- Export speed reports
- Email/SMS alerts for violations
- Speed limit zones on map
- Driver scoring based on speed
- Configurable thresholds
- Speed trends over time
- Comparison charts
