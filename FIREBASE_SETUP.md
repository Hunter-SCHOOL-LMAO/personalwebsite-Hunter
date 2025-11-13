# Firebase Setup Instructions

## Step 1: Get Your Firebase Configuration

To connect your website to Firestore, you need to add your Firebase configuration to `public/colors.html`.

### How to Get Your Firebase Config:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **personalwebsite-hunter**
3. Click on the **gear icon** (⚙️) next to "Project Overview"
4. Select **Project settings**
5. Scroll down to "Your apps" section
6. If you don't have a web app yet:
   - Click "Add app" and select the **Web** icon (`</>`)
   - Register your app with a nickname (e.g., "Personal Website")
7. Copy the `firebaseConfig` object

### Step 2: Update colors.html

Open `public/colors.html` and find this section (around line 114):

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "personalwebsite-hunter.firebaseapp.com",
  projectId: "personalwebsite-hunter",
  storageBucket: "personalwebsite-hunter.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

Replace it with your actual configuration from the Firebase Console.

## Step 3: Test Your Connection

1. Make sure you have some documents in your Firestore `colors` collection
2. Deploy your site or run it locally
3. Navigate to the Colors page
4. You should see your colors displayed!

## Expected Firestore Data Structure

The colors page expects documents in the `colors` collection with the following fields:

### Required Fields:
- **color** (or **hex**, **value**, **code**): The color code (e.g., "#FF5733", "rgb(255,87,51)")

### Optional Fields:
- **name**: Display name for the color
- **description**: Description of the color
- **category**: Category or grouping

### Example Document:

```json
{
  "name": "Sunset Orange",
  "color": "#FF5733",
  "description": "A warm, vibrant orange reminiscent of sunset",
  "category": "Warm Colors"
}
```

## Firestore Security Rules

Your current Firestore rules (in `firestore.rules`) allow read/write access until December 11, 2025. For production, you should update these rules to be more restrictive:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /colors/{document} {
      allow read: if true;  // Allow anyone to read colors
      allow write: if false; // Prevent public writes
    }
  }
}
```

## Troubleshooting

### "Error loading colors" message:
- Check that your Firebase config is correct
- Verify your Firestore rules allow read access to the `colors` collection
- Check the browser console for detailed error messages

### Empty state message:
- Make sure you have documents in the `colors` collection
- Check that the documents have a `color`, `hex`, `value`, or `code` field

### Colors not updating:
- The page uses real-time updates via Firestore's `onSnapshot` listener
- Any changes to the `colors` collection should appear automatically

## Deploy to Firebase Hosting

To deploy your updated site:

```bash
firebase deploy
```

Or to deploy only hosting:

```bash
firebase deploy --only hosting
```

