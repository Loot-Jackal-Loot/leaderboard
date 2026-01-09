const firebaseConfig = {
    apiKey: "AIzaSyCZlUOMA72TmNU07KsXSaJp_4KIV854hpg",
    databaseURL: "https://secondsgamejam-8b2a8-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "secondsgamejam-8b2a8",
    appId: "1:715814516330:web:a4a41f5f2580d88eb7bc13"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Database reference
const database = firebase.database();
