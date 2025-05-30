// Initialize DOM elements
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const paragraphInput = document.getElementById('paragraphInput');
const fontSizeInput = document.getElementById('fontSizeInput');
const fontSizeLabel = document.getElementById('fontSizeLabel');
const textAlignInput = document.getElementById('textAlignInput');
const fontColorInput = document.getElementById('fontColorInput');
const fontSelect = document.getElementById('fontSelect');
const imageUpload = document.getElementById('imageUpload');
const xlsxUpload = document.getElementById('xlsxUpload');
const executeBtn = document.getElementById('executeBtn');
const resetBtn = document.getElementById('resetBtn');
const editBtn = document.getElementById('editBtn');
const downloadPDFBtn = document.getElementById('downloadPDF');
const boldBtn = document.getElementById('boldBtn');
const italicBtn = document.getElementById('italicBtn');
const sendEmailCheckbox = document.getElementById('sendEmailCheckbox');
const emailSubjectInput = document.getElementById('emailSubjectInput');
const emailBodyInput = document.getElementById('emailBodyInput');
const overflowList = document.getElementById('overflowList');
const pdfList = document.getElementById('pdfList');
const fontUpdateMessage = document.getElementById('fontUpdateMessage');
const batchStatus = document.getElementById('batchStatus');
const pdfProgress = document.getElementById('pdfProgress');
const pdfProgressFill = document.getElementById('pdfProgressFill');
const emailProgress = document.getElementById('emailProgress');
const emailProgressFill = document.getElementById('emailProgressFill');
const progressModal = document.getElementById('progressModal');
const hamburgerMenu = document.getElementById('hamburgerMenu');
const sidebar = document.querySelector('.sidebar');
const mainSection = document.querySelector('.main');

// Initialize state variables
let backgroundImage = null;
let paragraphText = paragraphInput.value;
let backgroundImageId = null;
let studentData = [];
let columnNames = [];
let lastXlsxFile = null;
let overflowStudents = [];
let pdfFiles = [];
let currentStudent = null;
let studentSettings = {};
const defaultRect = { x: 100, y: 100, width: 400, height: 250 };
let currentRect = { ...defaultRect };
let currentFontSize = parseInt(fontSizeInput.value);
let currentTextAlign = textAlignInput.value;
let currentFontColor = fontColorInput.value;
let userSelectedFont = 'Arial';
let currentBold = false;
let currentItalic = false;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let resizing = false;
let resizeHandle = null;
const handleSize = 10;
let showHelpers = true;
const BATCH_SIZE = 50;
// Undo/Redo history
let history = [];
let historyIndex = -1;
emailSubjectInput.disabled = true;
emailBodyInput.disabled = true;

// Show alert message
function showAlert(message) {
  const alert = document.createElement('div');
  alert.textContent = message;
  alert.className = 'alert';
  document.body.appendChild(alert);
  setTimeout(() => {
    alert.classList.add('show');
  }, 10);
  setTimeout(() => {
    alert.classList.remove('show');
    setTimeout(() => alert.remove(), 300);
  }, 2000);
}

document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', () => {
    const content = document.getElementById(header.dataset.toggle);
    const isOpen = content.classList.contains('open');
    
    document.querySelectorAll('.accordion-content').forEach(c => {
      c.classList.remove('open');
      c.style.maxHeight = '0';
      c.parentElement.querySelector('.accordion-header').classList.remove('open');
    });
    
    if (!isOpen) {
      content.classList.add('open');
      content.style.maxHeight = `${content.scrollHeight + 48}px`;
      header.classList.add('open');
      
      if (header.dataset.toggle === 'progress-lists') {
        const overflowList = document.getElementById('overflowList');
        const pdfList = document.getElementById('pdfList');
        const buttonBar = document.querySelector('.button-bar');
        const accordionTop = content.getBoundingClientRect().top + window.scrollY;
        const buttonBarHeight = buttonBar ? buttonBar.offsetHeight : 60;
        const availableHeight = window.innerHeight - accordionTop - buttonBarHeight - 80;
        const listHeight = Math.max(100, Math.min(availableHeight, 400));
        if (overflowList) overflowList.style.maxHeight = `${listHeight}px`;
        if (pdfList) pdfList.style.maxHeight = `${listHeight}px`;
      }
    }
  });
});

const updateSidebarState = () => {
  if (window.innerWidth <= 768) {
    sidebar.classList.add('collapsed');
    sidebar.classList.remove('open');
    mainSection.classList.add('full-width');
    hamburgerMenu.classList.remove('open');
    hamburgerMenu.setAttribute('aria-expanded', 'false');
  } else {
    sidebar.classList.remove('collapsed');
    sidebar.classList.add('open');
    mainSection.classList.remove('full-width');
    hamburgerMenu.classList.add('open');
    hamburgerMenu.setAttribute('aria-expanded', 'true');
  }
};

// Save state to history
function saveHistory() {
  const state = {
    studentSettings: JSON.parse(JSON.stringify(studentSettings)),
    currentRect: { ...currentRect },
    currentFontSize,
    currentTextAlign,
    currentFontColor,
    userSelectedFont,
    currentBold,
    currentItalic
  };
  history = history.slice(0, historyIndex + 1);
  history.push(state);
  historyIndex++;
  if (history.length > 50) {
    history.shift();
    historyIndex--;
  }
}

// Undo action
function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    applyHistoryState(history[historyIndex]);
  }
}

// Redo action
function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    applyHistoryState(history[historyIndex]);
  }
}

// Apply history state
function applyHistoryState(state) {
  studentSettings = JSON.parse(JSON.stringify(state.studentSettings));
  currentRect = { ...state.currentRect };
  currentFontSize = state.currentFontSize;
  currentTextAlign = state.currentTextAlign;
  currentFontColor = state.currentFontColor;
  userSelectedFont = state.userSelectedFont;
  currentBold = state.currentBold;
  currentItalic = state.currentItalic;
  fontSizeInput.value = currentFontSize;
  fontSizeLabel.textContent = currentFontSize + 'px';
  textAlignInput.value = currentTextAlign;
  fontColorInput.value = currentFontColor;
  fontSelect.value = userSelectedFont;
  boldBtn.classList.toggle('active', currentBold);
  italicBtn.classList.toggle('active', currentItalic);
  overflowStudents = overflowStudents.filter(s => s.Name !== currentStudent?.Name);
  const hasOverflow = draw(true, paragraphText, currentStudent);
  if (hasOverflow && currentStudent) {
    overflowStudents.push(currentStudent);
  }
  updateOverflowList();
  updatePDFList();
}

async function deleteBackgroundImage() {
  if (backgroundImageId) {
    try {
      const response = await fetch('https://cert-gen-app.onrender.com//delete-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: backgroundImageId })
      });
      if (!response.ok) throw new Error('Failed to delete background image');
      console.log('Background image deleted from server');
      backgroundImageId = null;
    } catch (error) {
      console.error('Error deleting background image:', error);
      showAlert('Failed to delete background image from server');
    }
  }
}

// Clear state after processing
async function clearState() {
  await deleteBackgroundImage();
  studentData = [];
  columnNames = [];
  xlsxUpload.value = null;
  imageUpload.value = null;
  lastXlsxFile = null;
  overflowStudents = [];
  pdfFiles = [];
  studentSettings = {};
  currentStudent = null;
  currentRect = { ...defaultRect };
  currentFontSize = 16;
  currentTextAlign = 'left';
  currentFontColor = '#000000';
  userSelectedFont = 'Arial';
  currentBold = false;
  currentItalic = false;
  fontSizeInput.value = currentFontSize;
  fontSizeLabel.textContent = currentFontSize + 'px';
  textAlignInput.value = currentTextAlign;
  fontColorInput.value = currentFontColor;
  fontSelect.value = userSelectedFont;
  boldBtn.classList.remove('active');
  italicBtn.classList.remove('active');
  paragraphInput.value = '';
  emailSubjectInput.value = 'Congratulations on Your Certificate, {Name}!';
  emailBodyInput.value = 'Dear {Name},\nCongratulations on completing {Course}! Your certificate is attached.\nBest regards,\nTeam';
  paragraphText = '';
  backgroundImage = null;
  canvas.width = 800;
  canvas.height = 600;
  history = [];
  historyIndex = -1;
  updateOverflowList();
  updatePDFList();
  executeBtn.style.display = 'block';
  editBtn.style.display = 'none';
  downloadPDFBtn.style.display = 'none';
  executeBtn.disabled = false;
  xlsxUpload.disabled = false;
  imageUpload.disabled = false;
  paragraphInput.disabled = false;
  fontSelect.disabled = false;
  fontColorInput.disabled = false;
  boldBtn.disabled = false;
  italicBtn.disabled = false;
  progressModal.classList.remove('visible');
  batchStatus.textContent = 'No batches in progress';
  pdfProgress.textContent = 'PDF Generation: 0/0';
  pdfProgressFill.style.width = '0%';
  emailProgress.textContent = 'Email Sending: 0/0';
  emailProgressFill.style.width = '0%';
  sidebar.classList.remove('collapsed');
  mainSection.classList.remove('full-width');
  hamburgerMenu.textContent = '☰';
  resetBtn.style.display = "none";
  showAlert('Processing complete, editor state cleared');
  draw();

}

// Fetch available fonts from server
async function fetchFonts() {
  try {
    const response = await fetch('https://cert-gen-app.onrender.com//fonts');
    if (!response.ok) throw new Error('Failed to fetch fonts');
    const fonts = await response.json();
    fontSelect.innerHTML = '';
    fonts.forEach(font => {
      const option = document.createElement('option');
      option.value = font;
      option.textContent = font;
      fontSelect.appendChild(option);
    });
    fontSelect.value = userSelectedFont;
  } catch (error) {
    console.error('Error fetching fonts:', error);
    showAlert('Error loading fonts');
  }
}

// Select a font
async function selectFont(fontName) {
  try {
    // Fetch font file from server
    const response = await fetch(`https://cert-gen-app.onrender.com//font/${fontName}`);
    if (!response.ok) throw new Error(`Failed to fetch font ${fontName}`);
    
    // Get font file as ArrayBuffer
    const fontBuffer = await response.arrayBuffer();
    
    // Create and load FontFace
    const fontFace = new FontFace(fontName, fontBuffer);
    await fontFace.load();
    document.fonts.add(fontFace);
    
    // Update font state
    userSelectedFont = fontName;
    fontSelect.value = fontName;
    saveStudentSettings(currentStudent);
    saveHistory(); // Save font family change
    
    // Redraw canvas with new font
    overflowStudents = overflowStudents.filter(s => s.Name !== currentStudent?.Name);
    const hasOverflow = draw(true, paragraphText, currentStudent);
    if (hasOverflow && currentStudent) {
      overflowStudents.push(currentStudent);
    }
    updateOverflowList();
    
    // Show success message
    fontUpdateMessage.textContent = `Font updated to ${fontName}`;
    fontUpdateMessage.classList.add('show');
    setTimeout(() => {
      fontUpdateMessage.classList.remove('show');
      fontUpdateMessage.textContent = '';
    }, 2000);
  } catch (error) {
    console.error('Error loading font:', error);
    showAlert(`Failed to load font ${fontName}. Using default font.`);
    // Fallback to default font
    userSelectedFont = 'Arial';
    fontSelect.value = 'Arial';
    draw(true, paragraphText, currentStudent);
    updateOverflowList();
  }
}

// Replace placeholders
function replacePlaceholders(paragraph, student) {
  let result = paragraph;
  for (const key of columnNames) {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), student[key] || '');
  }
  return result;
}

// Draw certificate on canvas
function draw(showHelpersOverride = true, text = paragraphText, student = null) {
  const shouldShowHelpers = showHelpersOverride && showHelpers;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  }
  const settings = student && studentSettings[student.Name] || {
    rect: { ...currentRect },
    fontSize: currentFontSize,
    textAlign: currentTextAlign,
    fontColor: currentFontColor,
    fontFamily: userSelectedFont,
    bold: currentBold,
    italic: currentItalic
  };
  if (shouldShowHelpers) {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(settings.rect.x, settings.rect.y, settings.rect.width, settings.rect.height);
    drawHandles(settings.rect);
  }
  const displayText = student ? replacePlaceholders(text, student) : text;
  const weight = settings.bold ? 'bold' : 'normal';
  const style = settings.italic ? 'italic' : 'normal';
  ctx.font = `${style} ${weight} ${settings.fontSize}px "${settings.fontFamily}"`;
  ctx.fillStyle = settings.fontColor;
  ctx.textAlign = settings.textAlign;
  const words = displayText.split(' ');
  let line = '';
  const lineHeight = settings.fontSize * 1.5;
  let y = settings.rect.y + lineHeight;
  let overflow = false;
  const xOffset = settings.textAlign === 'center' ? settings.rect.x + settings.rect.width / 2 :
                  settings.textAlign === 'right' ? settings.rect.x + settings.rect.width - 5 :
                  settings.rect.x + 5;
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > settings.rect.width - 10) {
      if (y + lineHeight > settings.rect.y + settings.rect.height) {
        overflow = true;
        break;
      }
      ctx.fillText(line, xOffset, y);
      line = words[i] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (!overflow) {
    ctx.fillText(line, xOffset, y);
  }
  if (shouldShowHelpers && overflow) {
    ctx.fillStyle = 'red';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('[Text overflow]', settings.rect.x + 5, settings.rect.y + settings.rect.height - 5);
  }
  return overflow;
}

// Draw resize handles
function drawHandles(rect) {
  ctx.fillStyle = '#10b981';
  getHandles(rect).forEach(h => {
    ctx.beginPath();
    ctx.arc(h.x, h.y, handleSize / 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Get resize handle positions
function getHandles(rect) {
  const { x, y, width, height } = rect;
  return [
    { x: x, y: y, name: 'nw' },
    { x: x + width / 2, y: y, name: 'n' },
    { x: x + width, y: y, name: 'ne' },
    { x: x + width, y: y + height / 2, name: 'e' },
    { x: x + width, y: y + height, name: 'se' },
    { x: x + width / 2, y: y + height, name: 's' },
    { x: x, y: y + height, name: 'sw' },
    { x: x, y: y + height / 2, name: 'w' }
  ];
}

// Detect handle under cursor
function getHandleUnderCursor(mx, my, rect) {
  return getHandles(rect).find(h =>
    Math.abs(h.x - mx) <= handleSize && Math.abs(h.y - my) <= handleSize
  );
}

// Save student settings
function saveStudentSettings(student) {
  if (!student) return;
  studentSettings[student.Name] = {
    rect: { ...currentRect },
    fontSize: currentFontSize,
    textAlign: currentTextAlign,
    fontColor: currentFontColor,
    fontFamily: userSelectedFont,
    bold: currentBold,
    italic: currentItalic
  };
}

// Load student settings
function loadStudentSettings(student) {
  if (!student) return;
  const settings = studentSettings[student.Name];
  if (settings) {
    currentRect = { ...settings.rect };
    currentFontSize = settings.fontSize;
    currentTextAlign = settings.textAlign;
    currentFontColor = settings.fontColor;
    userSelectedFont = settings.fontFamily;
    currentBold = settings.bold;
    currentItalic = settings.italic;
    fontSizeInput.value = currentFontSize;
    fontSizeLabel.textContent = currentFontSize + 'px';
    textAlignInput.value = currentTextAlign;
    fontColorInput.value = currentFontColor;
    fontSelect.value = userSelectedFont;
    boldBtn.classList.toggle('active', currentBold);
    italicBtn.classList.toggle('active', currentItalic);
  } else {
    currentRect = { ...defaultRect };
    currentFontSize = parseInt(fontSizeInput.value);
    currentTextAlign = textAlignInput.value;
    currentFontColor = fontColorInput.value;
    userSelectedFont = fontSelect.value;
    currentBold = false;
    currentItalic = false;
    fontSizeInput.value = currentFontSize;
    fontSizeLabel.textContent = currentFontSize + 'px';
    textAlignInput.value = currentTextAlign;
    fontColorInput.value = currentFontColor;
    fontSelect.value = userSelectedFont;
    boldBtn.classList.remove('active');
    italicBtn.classList.remove('active');
  }
}

// Update overflow list
function updateOverflowList() {
  overflowList.innerHTML = '';
  if (overflowStudents.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No overflows detected';
    li.classList.add('empty');
    overflowList.appendChild(li);
    overflowList.parentElement.style.display = 'none';
  } else {
    overflowStudents.forEach(student => {
      const li = document.createElement('li');
      li.textContent = student.Name;
      li.setAttribute('role', 'option');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-label', `Select ${student.Name} to adjust overflow`);
      li.setAttribute('title', student.Name);
      li.addEventListener('click', () => {
        currentStudent = student;
        loadStudentSettings(student);
        document.querySelectorAll('.overflow-list li').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.pdf-list li').forEach(item => item.classList.remove('active'));
        li.classList.add('active');
        draw(true, paragraphText, student);
      });
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          currentStudent = student;
          loadStudentSettings(student);
          document.querySelectorAll('.overflow-list li').forEach(item => item.classList.remove('active'));
          document.querySelectorAll('.pdf-list li').forEach(item => item.classList.remove('active'));
          li.classList.add('active');
          draw(true, paragraphText, student);
        }
      });
      overflowList.appendChild(li);
    });
    overflowList.parentElement.style.display = 'block';
  }
}

// Update PDF names list
function updatePDFList() {
  pdfList.innerHTML = '';
  if (pdfFiles.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No certificates generated';
    li.classList.add('empty');
    pdfList.appendChild(li);
    pdfList.parentElement.style.display = 'none';
  } else {
    pdfFiles.forEach(pdf => {
      const li = document.createElement('li');
      li.textContent = pdf.fileName;
      li.setAttribute('role', 'option');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-label', `Preview certificate ${pdf.fileName}`);
      li.setAttribute('title', pdf.fileName);
      li.addEventListener('click', () => {
        currentStudent = pdf.student;
        loadStudentSettings(pdf.student);
        document.querySelectorAll('.overflow-list li').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.pdf-list li').forEach(item => item.classList.remove('active'));
        li.classList.add('active');
        draw(true, paragraphText, pdf.student);
      });
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          currentStudent = pdf.student;
          loadStudentSettings(pdf.student);
          document.querySelectorAll('.overflow-list li').forEach(item => item.classList.remove('active'));
          document.querySelectorAll('.pdf-list li').forEach(item => item.classList.remove('active'));
          li.classList.add('active');
          draw(true, paragraphText, pdf.student);
        }
      });
      pdfList.appendChild(li);
    });
    pdfList.parentElement.style.display = 'block';
  }
  downloadPDFBtn.style.display = pdfFiles.length > 0 ? 'block' : 'none';
  downloadPDFBtn.disabled = overflowStudents.length > 0;
  downloadPDFBtn.textContent = overflowStudents.length > 0 ? 'Resolve Overflows First' : 'Generate Certificates';
}

sendEmailCheckbox.addEventListener('change', function(event){
  if(this.checked){
    emailSubjectInput.disabled = false;
    emailBodyInput.disabled = false;
  } else {
    emailSubjectInput.disabled = true;
    emailBodyInput.disabled = true;
  }
});

// Canvas mouse handlers
canvas.addEventListener('mousedown', (e) => {
  showHelpers = true;
  draw(true, paragraphText, currentStudent);
  const rectBounds = canvas.getBoundingClientRect();
  const mx = e.clientX - rectBounds.left;
  const my = e.clientY - rectBounds.top;
  const handle = getHandleUnderCursor(mx, my, currentRect);
  if (handle) {
    resizing = true;
    resizeHandle = handle.name;
    return;
  }
  if (mx > currentRect.x && mx < currentRect.x + currentRect.width &&
      my > currentRect.y && my < currentRect.y + currentRect.height) {
    isDragging = true;
    dragOffset.x = mx - currentRect.x;
    dragOffset.y = my - currentRect.y;
  }
});

document.addEventListener('click', (e) => {
  if (!canvas.contains(e.target)) {
    showHelpers = false;
    draw(true, paragraphText, currentStudent);
  }
});

canvas.addEventListener('mousemove', (e) => {
  const rectBounds = canvas.getBoundingClientRect();
  const mx = e.clientX - rectBounds.left;
  const my = e.clientY - rectBounds.top;
  const handle = getHandleUnderCursor(mx, my, currentRect);
  if (resizing) {
    const minSize = 50;
    const dx = mx - currentRect.x;
    const dy = my - currentRect.y;
    switch (resizeHandle) {
      case 'se':
        currentRect.width = Math.max(minSize, dx);
        currentRect.height = Math.max(minSize, dy);
        break;
      case 's':
        currentRect.height = Math.max(minSize, dy);
        break;
      case 'e':
        currentRect.width = Math.max(minSize, dx);
        break;
      case 'n':
        const nHeight = currentRect.height + (currentRect.y - my);
        if (nHeight >= minSize) {
          currentRect.y = my;
          currentRect.height = nHeight;
        }
        break;
      case 'w':
        const nwWidth = currentRect.width + (currentRect.x - mx);
        if (nwWidth >= minSize) {
          currentRect.x = mx;
          currentRect.width = nwWidth;
        }
        break;
      case 'nw':
        if (currentRect.width + (currentRect.x - mx) >= minSize) {
          currentRect.width += currentRect.x - mx;
          currentRect.x = mx;
        }
        if (currentRect.height + (currentRect.y - my) >= minSize) {
          currentRect.height += currentRect.y - my;
          currentRect.y = my;
        }
        break;
      case 'ne':
        if (dx >= minSize) currentRect.width = dx;
        if (currentRect.height + (currentRect.y - my) >= minSize) {
          currentRect.height += currentRect.y - my;
          currentRect.y = my;
        }
        break;
      case 'sw':
        if (dy >= minSize) currentRect.height = dy;
        if (currentRect.width + (currentRect.x - mx) >= minSize) {
          currentRect.width += currentRect.x - mx;
          currentRect.x = mx;
        }
        break;
    }
    saveStudentSettings(currentStudent);
    overflowStudents = overflowStudents.filter(s => s.Name !== currentStudent?.Name);
    const hasOverflow = draw(true, paragraphText, currentStudent);
    if (hasOverflow && currentStudent) {
      overflowStudents.push(currentStudent);
    }
    updateOverflowList();
    updatePDFList();
  } else if (isDragging) {
    currentRect.x = mx - dragOffset.x;
    currentRect.y = my - dragOffset.y;
    saveStudentSettings(currentStudent);
    overflowStudents = overflowStudents.filter(s => s.Name !== currentStudent?.Name);
    const hasOverflow = draw(true, paragraphText, currentStudent);
    if (hasOverflow && currentStudent) {
      overflowStudents.push(currentStudent);
    }
    updateOverflowList();
    updatePDFList();
  }
  canvas.style.cursor = handle ? `${handle.name}-resize` :
    (mx > currentRect.x && mx < currentRect.x + currentRect.width &&
    my > currentRect.y && my < currentRect.y + currentRect.height) ? 'move' : 'default';
});

canvas.addEventListener('mouseup', () => {
  isDragging = false;
  resizing = false;
  resizeHandle = null;
  if (currentStudent) {
    saveStudentSettings(currentStudent);
    saveHistory(); // Save final state after drag or resize
    const hasOverflow = draw(true, paragraphText, currentStudent);
    if (hasOverflow && !overflowStudents.some(s => s.Name === currentStudent.Name)) {
      overflowStudents.push(currentStudent);
    }
    updateOverflowList();
    updatePDFList();
  }
});

// Keyboard navigation for canvas
canvas.addEventListener('keydown', (e) => {
  if (!currentStudent) return;
  let changed = false;
  const moveStep = 5;
  const resizeStep = 5;
  const minSize = 50;

  if (e.key === 'ArrowUp') {
    if (e.shiftKey) {
      const newHeight = currentRect.height - resizeStep;
      if (newHeight >= minSize) {
        currentRect.height = newHeight;
        currentRect.y += resizeStep;
        changed = true;
      }
    } else {
      currentRect.y -= moveStep;
      changed = true;
    }
  } else if (e.key === 'ArrowDown') {
    if (e.shiftKey) {
      const newHeight = currentRect.height + resizeStep;
      currentRect.height = newHeight;
      changed = true;
    } else {
      currentRect.y += moveStep;
      changed = true;
    }
  } else if (e.key === 'ArrowLeft') {
    if (e.shiftKey) {
      const newWidth = currentRect.width - resizeStep;
      if (newWidth >= minSize) {
        currentRect.width = newWidth;
        currentRect.x += resizeStep;
        changed = true;
      }
    } else {
      currentRect.x -= moveStep;
      changed = true;
    }
  } else if (e.key === 'ArrowRight') {
    if (e.shiftKey) {
      currentRect.width += resizeStep;
      changed = true;
    } else {
      currentRect.x += moveStep;
      changed = true;
    }
  }

  if (changed) {
    e.preventDefault();
    saveStudentSettings(currentStudent);
    saveHistory(); // Save each keypress as a discrete placement
    overflowStudents = overflowStudents.filter(s => s.Name !== currentStudent?.Name);
    const hasOverflow = draw(true, paragraphText, currentStudent);
    if (hasOverflow && currentStudent) {
      overflowStudents.push(currentStudent);
    }
    updateOverflowList();
    updatePDFList();
  }
});

// Make canvas focusable
canvas.setAttribute('tabindex', '0');

// Undo/Redo keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
    console.log("Crtl+Z");
    e.preventDefault();
    undo();
  } else if (e.ctrlKey && e.key === 'Z' && e.shiftKey) {
    console.log("CRTL+SHIFT+Z");
    e.preventDefault();
    redo();
  }
});

// Hamburger menu toggle
hamburgerMenu.addEventListener('click', () => {
  const isOpen = !sidebar.classList.contains('collapsed');
  sidebar.classList.toggle('collapsed', isOpen);
  sidebar.classList.toggle('open', isOpen);
  mainSection.classList.toggle('full-width', isOpen);
  hamburgerMenu.classList.toggle('open', !isOpen);
  hamburgerMenu.setAttribute('aria-expanded', !isOpen);
});

// Ensure sidebar is collapsed on mobile by default
if (window.innerWidth <= 768) {
  sidebar.classList.add('collapsed');
  sidebar.classList.remove('open');
  mainSection.classList.add('full-width');
  hamburgerMenu.classList.remove('open');
  hamburgerMenu.setAttribute('aria-expanded', 'false');
} else {
  sidebar.classList.remove('collapsed');
  sidebar.classList.add('open');
  mainSection.classList.remove('full-width');
  hamburgerMenu.classList.add('open');
  hamburgerMenu.setAttribute('aria-expanded', 'true');
}

// Input handlers
paragraphInput.addEventListener('input', () => {
  paragraphText = paragraphInput.value;
  overflowStudents = [];
  pdfFiles = [];
  studentSettings = {};
  updateOverflowList();
  updatePDFList();
  draw(true, paragraphText, currentStudent);
});

fontSizeInput.addEventListener('input', () => {
  currentFontSize = parseInt(fontSizeInput.value);
  fontSizeLabel.textContent = currentFontSize + 'px';
  saveStudentSettings(currentStudent);
  saveHistory(); // Save font size change
  overflowStudents = overflowStudents.filter(s => s.Name !== currentStudent?.Name);
  const hasOverflow = draw(true, paragraphText, currentStudent);
  if (hasOverflow && currentStudent) {
    overflowStudents.push(currentStudent);
  }
  updateOverflowList();
  updatePDFList();
});

textAlignInput.addEventListener('change', () => {
  currentTextAlign = textAlignInput.value;
  saveStudentSettings(currentStudent);
  saveHistory(); // Save text alignment change
  overflowStudents = overflowStudents.filter(s => s.Name !== currentStudent?.Name);
  const hasOverflow = draw(true, paragraphText, currentStudent);
  if (hasOverflow && currentStudent) {
    overflowStudents.push(currentStudent);
  }
  updateOverflowList();
  updatePDFList();
});

fontColorInput.addEventListener('input', () => {
  currentFontColor = fontColorInput.value;
  saveStudentSettings(currentStudent);
  saveHistory(); // Save font color change
  overflowStudents = overflowStudents.filter(s => s.Name !== currentStudent?.Name);
  const hasOverflow = draw(true, paragraphText, currentStudent);
  if (hasOverflow && currentStudent) {
    overflowStudents.push(currentStudent);
  }
  updateOverflowList();
  updatePDFList();
});

// Font select handler
fontSelect.addEventListener('change', () => {
  selectFont(fontSelect.value); // Calls saveHistory internally
});

boldBtn.addEventListener('click', () => {
  currentBold = !currentBold;
  boldBtn.classList.toggle('active', currentBold);
  saveStudentSettings(currentStudent);
  saveHistory(); // Save bold toggle
  overflowStudents = overflowStudents.filter(s => s.Name !== currentStudent?.Name);
  const hasOverflow = draw(true, paragraphText, currentStudent);
  if (hasOverflow && currentStudent) {
    overflowStudents.push(currentStudent);
  }
  updateOverflowList();
  updatePDFList();
});

italicBtn.addEventListener('click', () => {
  currentItalic = !currentItalic;
  italicBtn.classList.toggle('active', currentItalic);
  saveStudentSettings(currentStudent);
  saveHistory(); // Save italic toggle
  overflowStudents = overflowStudents.filter(s => s.Name !== currentStudent?.Name);
  const hasOverflow = draw(true, paragraphText, currentStudent);
  if (hasOverflow && currentStudent) {
    overflowStudents.push(currentStudent);
  }
  updateOverflowList();
  updatePDFList();
});

// Upload background image to server
async function uploadBackgroundImage(file) {
  const formData = new FormData();
  formData.append('background', file);
  try {
    const response = await fetch('https://cert-gen-app.onrender.com//upload-background', {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      throw new Error('Failed to upload background image');
    }
    const { imageId } = await response.json(); // Expect server to return image ID
    backgroundImageId = imageId;
    console.log('Background image uploaded successfully, ID:', imageId);
  } catch (error) {
    console.error('Error uploading background:', error);
    showAlert('Error uploading background image');
    throw error;
  }
}

// Image upload handler
imageUpload.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file && ['image/png', 'image/jpeg'].includes(file.type)) {
    try {
      await uploadBackgroundImage(file);
      const img = new Image();
      img.onload = function () {
        const canvasWidth = window.innerWidth - (sidebar.classList.contains('collapsed') ? 0 : 380);
        const canvasHeight = window.innerHeight - 80;
        const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        currentRect = { ...defaultRect, x: (canvas.width - defaultRect.width) / 2, y: (canvas.height - defaultRect.height) / 2 };
        backgroundImage = img;
        overflowStudents = [];
        pdfFiles = [];
        studentSettings = {};
        updateOverflowList();
        updatePDFList();
        draw(true, paragraphText,);
      };
      img.src = URL.createObjectURL(file);
    } catch (error) {
      backgroundImage = null;
    }
  } else {
    showAlert('Please upload a valid PNG or JPEG image.');
  }
});

// XLSX upload handler
xlsxUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  lastXlsxFile = file;
  if (!file || !['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(file.type)) {
    showAlert('Please upload a valid XLSXLSX file.');
    lastXlsxFile = null;
    studentData = [];
    columnNames = [];
    overflowStudents = [];
    pdfFiles = [];
    updateOverflowList();
    updatePDFList();
    return;
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (json.length > 1) {
      columnNames = json[0];
      studentData = XLSX.utils.sheet_to_json(worksheet);
      studentData = studentData.filter(student => 
        student.Name && typeof student.Name === 'string' && 
        student.Name.trim() !== '' && student.Name !== 'Name' &&
        student.Email && typeof student.Email === 'string' && 
        student.Email.includes('@')
      );
      if (studentData.length === 0) {
        showAlert('No valid students found in XLSXLSX (requires Name and Email).');
        studentData = [];
        columnNames = [];
        lastXlsxFile = null;
        overflowStudents = [];
        pdfFiles = [];
        updateOverflowList();
        updatePDFList();
        return;
      }
      if (columnNames.includes('Name') && columnNames.includes('Email')) {
        const placeholders = (paragraphText.match(/\{[^}]+\}/g) || []).map(p => p.slice(1, -1));
        const invalidPlaceholders = placeholders.filter(p => !columnNames.includes(p));
        if (invalidPlaceholders.length > 0) {
          showAlert(`Invalid placeholders: ${invalidPlaceholders.join(', ')}. Use column names: ${columnNames.join(', ')}.`);
          studentData = [];
          columnNames = [];
          lastXlsxFile = null;
          overflowStudents = [];
          pdfFiles = [];
          updateOverflowList();
          updatePDFList();
          return;
        }
        currentStudent = studentData[0];
        overflowStudents = [];
        pdfFiles = [];
        studentSettings = {};
        updateOverflowList();
        updatePDFList();
        draw();
      } else {
        showAlert('Error XLSX file must contain "Name" and "Email" columns.');
        studentData = [];
        columnNames = [];
        lastXlsxFile = null;
        overflowStudents = [];
        pdfFiles = [];
        updateOverflowList();
        updatePDFList();
      }
    } else {
      showAlert('XLSX file is empty or invalid.');
      studentData = [];
      columnNames = [];
      lastXlsxFile = null;
      overflowStudents = [];
      pdfFiles = [];
      updateOverflowList();
      updatePDFList();
    }
  };
  reader.readAsArrayBuffer(file);
});

// Execute button handler
executeBtn.addEventListener('click', () => {
  if (!backgroundImage) {
    showAlert('Please upload a background image.');
    return;
  }
  if (studentData.length === 0 && lastXlsxFile) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (json.length > 0) {
        columnNames = json[0];
        studentData = XLSX.utils.sheet_to_json(worksheet);
        studentData = studentData.filter(student => 
          studentData.Name && typeof student.Name === 'string' && 
          studentData.Name.trim() !== '' && studentData.Name !== 'Name' &&
          studentData.Email && typeof student.Email === 'string' && 
          studentData.Email.includes('@')
        );
        if (studentData.length === 0) {
          showAlert('No valid students found in XLSXLSX (requires Name and Email).');
          studentData = [];
          columnNames = [];
          lastXlsxFile = null;
          overflowStudents = [];
          pdfFiles = [];
          updateOverflowList();
          updatePDFList();
          return;
        }
        if (!columnNames.includes('Name') || !columnNames.includes('Email')) {
          showAlert('XLSX file must contain "Name" and "Email" columns.');
          studentData = [];
          columnNames = [];
          lastXlsxFile = null;
          overflowStudents = [];
          pdfFiles = [];
          updateOverflowList();
          updatePDFList();
          return;
        }
        currentStudent = studentData[0];
      } else {
        showAlert('XLSX file is empty or invalid.');
        studentData = [];
        columnNames = [];
        lastXlsxFile = null;
        overflowStudents = [];
        pdfFiles = [];
        updateOverflowList();
        updatePDFList();
        return;
      }
      proceedWithExecution();
    };
    reader.readAsArrayBuffer(lastXlsxFile);
  } else if (studentData.length === 0) {
    showAlert('Please upload a valid XLSX file with student data.');
    return;
  } else {
    proceedWithExecution();
  }

  function proceedWithExecution() {
    if (!paragraphText) {
      showAlert('Please enter a certificate paragraph.');
      return;
    }
    const placeholders = (paragraphText.match(/\{[^}]+\}/g) || []).map(p => p.slice(1, -1));
    const invalidPlaceholders = placeholders.filter(p => !columnNames.includes(p));
    if (invalidPlaceholders.length > 0) {
      showAlert(`Invalid placeholders: ${invalidPlaceholders.join(', ')}. Use column names: ${columnNames.join(', ')}.`);
      return;
    }
    executeBtn.disabled = true;
    executeBtn.textContent = 'Verifying...';
    xlsxUpload.disabled = true;
    imageUpload.disabled = true;
    paragraphInput.disabled = true;
    fontSelect.disabled = true;
    fontColorInput.disabled = true;
    boldBtn.disabled = true;
    italicBtn.disabled = true;
    overflowStudents = [];
    pdfFiles = [];
    studentData.forEach(student => {
      saveStudentSettings(student);
      const hasOverflow = draw(false, paragraphText, student);
      if (hasOverflow) {
        overflowStudents.push(student);
      }
      const fileName = `certificate_${student.Name.replace(/\s+/g, '_')}.pdf`;
      pdfFiles.push({ name: student.Name, fileName, student });
    });
    pdfFiles.push();
    executeBtn.style.display = 'none';
    editBtn.style.display = 'block';
    updateOverflowList();
    updatePDFList();
    if (executeBtn.length > 0) {
      showAlert('Resolve all overflow certificates before generating PDFsButtons.');
    }
    executeBtn.disabled = false;
    executeBtn.textContent = "Execute";
  }
});

// Edit button handler
editBtn.addEventListener('click', () => {
  xlsxUpload.disabled = false;
  imageUpload.disabled = false;
  paragraphInput.disabled = false;
  fontSelect.disabled = false;
  fontColorInput.disabled = false;
  boldBtn.disabled = false;
  italicBtn.disabled = false;
  overflowStudents = [];
  pdfFiles = [];
  studentSettings = {};
  currentStudent = studentData.length > 0 ? studentData[0] : null;
  updateOverflowList();
  updatePDFList();
  editBtn.style.display = 'none';
  executeBtn.style.display = 'block';
  executeBtn.disabled = false;
  draw(true, paragraphText, currentStudent);
});

resetBtn.addEventListener('click', async () => {
  await clearState();
});

// Convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Check email sending status
async function checkEmailStatus(batchId) {
  try {
    const response = await fetch(`https://cert-gen-app.onrender.com//email-status?batchId=${batchId}`);
    if (!response.ok) {
      throw new Error('Failed to check email status');
    }
    const { status, emailCount, total } = await response.json();
    return { status, emailCount, total };
  } catch (error) {
    console.error(`Error checking email status for batch ${batchId}:`, error);
    return { status: 'error', emailCount: 0, total: 0 };
  }
}

// Poll email status and update progress bar
async function pollEmailStatus(batchId, totalStudents, currentEmailCount) {
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`https://cert-gen-app.onrender.com//email-status?batchId=${batchId}`);
        if (!response.ok) {
          throw new Error('Failed to check email status');
        }
        const { status, emailCount, total } = await response.json();
        const cumulativeEmailCount = currentEmailCount + emailCount;
        emailProgress.textContent = `Email Sending: ${cumulativeEmailCount}/${totalStudents}`;
        emailProgressFill.style.width = `${(cumulativeEmailCount / totalStudents) * 100}%`;
        emailProgressFill.style.backgroundColor = 'blue'; // Maintain email progress color
        if (status !== 'pending' || cumulativeEmailCount >= totalStudents) {
          clearInterval(interval);
          resolve({ status, emailCount: cumulativeEmailCount, total });
        }
      } catch (error) {
        console.error(`Error checking email status for batch ${batchId}:`, error);
        clearInterval(interval);
        emailProgressFill.style.width = `${(currentEmailCount / totalStudents) * 100}%`;
        emailProgressFill.style.backgroundColor = 'blue'; // Reset email progress color on error
        resolve({ status: 'error', emailCount: currentEmailCount, total: totalStudents });
      }
    }, 500); // Faster polling for real-time updates
  });
}

// Generate PDFs in batches
downloadPDFBtn.addEventListener('click', async () => {
  if (overflowStudents.length > 0) {
    showAlert('Resolve all overflow certificates before generating PDFs.');
    return;
  }
  if (pdfFiles.length === 0) {
    showAlert('No certificates to generate. Please execute first.');
    return;
  }
  downloadPDFBtn.disabled = true;
  downloadPDFBtn.textContent = 'Processing Batches...';
  progressModal.classList.add('visible');
  const totalBatches = Math.ceil(studentData.length / BATCH_SIZE);
  const totalStudents = studentData.length;
  let previousBatch = null;
  let success = true;
  let totalProcessedPDFs = 0;
  let totalProcessedEmails = 0;

  try {
    progressModal.classList.add('visible'); // Show modal
    for (let batch = 0; batch < totalBatches; batch++) {
      const start = batch * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, studentData.length);
      const batchStudents = studentData.slice(start, end);
      const batchId = `batch_${batch + 1}_${Date.now()}`;
      batchStatus.textContent = `Processing Batch ${batch + 1} of ${totalBatches} (${batchStudents.length} students)`;
      pdfProgress.textContent = `PDF Generation: ${totalProcessedPDFs}/${totalStudents}`;
      pdfProgressFill.style.width = `${(totalProcessedPDFs / totalStudents) * 100}%`;
      pdfProgressFill.style.backgroundColor = 'green'; // Set PDF progress color
      emailProgress.textContent = `Email Sending: ${totalProcessedEmails}/${totalStudents}`;
      emailProgressFill.style.width = `${(totalProcessedEmails / totalStudents) * 100}%`;
      emailProgressFill.style.backgroundColor = 'blue'; // Set email progress color

      // Wait for previous batch emails
      if (previousBatch && sendEmailCheckbox.checked) {
        const emailStatus = await pollEmailStatus(previousBatch, totalStudents, totalProcessedEmails);
        if (emailStatus.status === 'error') {
          showAlert(`Email sending failed for batch ${batch}`);
          success = false;
          break;
        }
        totalProcessedEmails = emailStatus.emailCount; // Update cumulative email count
      }

      const batchData = {
        batchId,
        sendEmails: sendEmailCheckbox.checked,
        paragraph: paragraphText,
        emailSubject: emailSubjectInput.value,
        emailBody: emailBodyInput.value,
        canvas: { width: canvas.width, height: canvas.height },
        students: batchStudents.map(student => ({
          fileName: `certificate_${student.Name.replace(/\s+/g, '_')}.pdf`,
          email: student.Email,
          data: student,
          settings: studentSettings[student.Name] || {
            rect: currentRect,
            fontSize: currentFontSize,
            textAlign: currentTextAlign,
            fontColor: currentFontColor,
            fontFamily: userSelectedFont,
            bold: currentBold,
            italic: currentItalic
          }
        }))
      };

      // Send batch to server
      const response = await fetch('https://cert-gen-app.onrender.com//generate-pdfs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData)
      });

      if (!response.ok) {
        throw new Error(`Failed to generate PDFs for batch ${batch + 1}`);
      }

      const { zipBlob, pdfCount, emailCount } = await response.json();
      totalProcessedPDFs += pdfCount; // Accumulate PDFs
      totalProcessedEmails += emailCount; // Accumulate initial emails (likely 0)
      pdfProgress.textContent = `PDF Generation: ${totalProcessedPDFs}/${totalStudents}`;
      pdfProgressFill.style.width = `${(totalProcessedPDFs / totalStudents) * 100}%`;
      pdfProgressFill.style.backgroundColor = 'green'; // Maintain PDF progress color
      emailProgress.textContent = `Email Sending: ${totalProcessedEmails}/${totalStudents}`;
      emailProgressFill.style.width = `${(totalProcessedEmails / totalStudents) * 100}%`;
      emailProgressFill.style.backgroundColor = 'blue'; // Maintain email progress color

      // Download ZIP file for this batch
      const zipArrayBuffer = base64ToArrayBuffer(zipBlob);
      const blob = new Blob([zipArrayBuffer], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificates_batch_${batch + 1}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Poll email status if emails are enabled
      if (sendEmailCheckbox.checked) {
        const emailStatus = await pollEmailStatus(batchId, totalStudents, totalProcessedEmails);
        if (emailStatus.status === 'error') {
          showAlert(`Email sending failed for batch ${batch + 1}`);
          success = false;
          break;
        }
        totalProcessedEmails = emailStatus.emailCount; // Update cumulative email count
      }

      previousBatch = batchId;
    }

    if (success) {
      showAlert('All certificates generated successfully');
    } else {
      showAlert('Some batches failed to process');
    }
  } catch (error) {
    console.error('Error processing batches:', error);
    showAlert(`Error: ${error.message}`);
    success = false;
  } finally {
    downloadPDFBtn.disabled = false;
    downloadPDFBtn.textContent = 'Generate Certificates';
    progressModal.classList.remove('visible'); // Hide modal
    if (success) {
      resetBtn.style.display = "block";
      sendEmailCheckbox.checked = false;
    } else {
      progressModal.classList.remove('visible');
      batchStatus.textContent = 'Batch processing failed';
    }
  }
});

// Initialize
updateSidebarState();
window.addEventListener('resize', updateSidebarState);
fetchFonts();
draw();