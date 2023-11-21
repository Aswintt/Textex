const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3030;

// Multer configuration for handling file uploads
const storage = multer.diskStorage({
  destination: 'public/uploads/',
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Serve static files from the public directory
app.use(express.static('public'));

// Set up views engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

// Home route
app.get('/', (req, res) => {
  res.render('index');
});

// Handle file upload and text extraction
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const imagePath = `public/uploads/${req.file.filename}`;
  const iName = `${req.file.filename}`;
  
  // Use Tesseract to extract text from the uploaded image
  Tesseract.recognize(
    imagePath,
    'eng',
    { logger: info => console.log(info) }
  ).then(({ data: { text } }) => {
    const extractedText = text.trim().replace(/\n+/g, ' ');

      // Check if the extracted text contains a name
      const { nameText, idText, noId, noName } = extractNameFromText(extractedText);

    // Render the result page with the image and extracted text
    res.render('result', { iName, extractedText, nameText, idText, noId, noName });
  }).catch(err => {
    console.error('Error extracting text:', err.message);
    res.status(500).send('Error extracting text.');
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Function to extract a name from text
function extractNameFromText(text) {
  const words = text.split(' ');

  // Function to remove symbols and trim from a string
  function processWord(input) {
    // Remove symbols and trim
    return input.replace(/[^a-zA-Z0-9]/g, '').trim();
  }

  // Iterate through the words array and process each word
  const processedWords = words.map(processWord).filter(word => word !== '');

  // Log the modified array to check its content
  // console.log('Processed Words:', processedWords);

  // Initialize variables to store the result
  let nameText = '';
  let idText = '';
  let noId = '';
  let noName = '';

  // Check if the processed array contains 'Name'
  const nameIndex = processedWords.indexOf('Name');
  const idIndex = processedWords.indexOf('Id');

  // Write the result to the variables
  if (nameIndex !== -1 && nameIndex + 1 < processedWords.length) {
    nameText = processedWords[nameIndex + 1];

    if (idIndex !== -1 && idIndex + 1 < processedWords.length) {
      idText = processedWords[idIndex + 1];
    } else {
      noId = 'Result: Id content not found or no text after Id.';
    }
  } else {
    noName = 'Result: Name not found or no text after Name.';
  }

  // Return an object containing the result
  return {
    nameText,
    idText,
    noId,
    noName,
  };
}
