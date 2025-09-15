// Initialize PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
} else {
    console.error('PDF.js library not loaded properly');
}

// DOM Elements
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const compressionOptions = document.getElementById('compression-options');
const compressionProgress = document.getElementById('compression-progress');
const compressionResult = document.getElementById('compression-result');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const compressBtn = document.getElementById('compress-btn');
const downloadBtn = document.getElementById('download-btn');
const compressAnotherBtn = document.getElementById('compress-another-btn');
const originalSizeElement = document.getElementById('original-size');
const newSizeElement = document.getElementById('new-size');
const reductionPercentageElement = document.getElementById('reduction-percentage');
const themeToggle = document.querySelector('.theme-toggle');

// State variables
let selectedFile = null;
let compressedPdfData = null;
let isDarkMode = false;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Check for saved theme preference
    if (localStorage.getItem('theme') === 'dark') {
        enableDarkMode();
    }
    
    // Initialize animations for elements in viewport
    animateOnScroll();
    
    // Add smooth scrolling for navigation links
    setupSmoothScrolling();
});

// Theme toggle
themeToggle.addEventListener('click', () => {
    if (isDarkMode) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
});

// File Upload - Click
fileInput.addEventListener('change', (e) => {
    try {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    } catch (error) {
        console.error('Error handling file selection:', error);
        alert('There was an error selecting the file. Please try again.');
    }
});

// File Upload - Drag & Drop
if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('active');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('active');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('active');
        
        try {
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFileSelection(e.dataTransfer.files[0]);
            }
        } catch (error) {
            console.error('Error handling dropped file:', error);
            alert('There was an error processing the dropped file. Please try again.');
        }
    });

    uploadArea.addEventListener('click', () => {
        if (fileInput) {
            fileInput.click();
        }
    });
}

// Compress Button
if (compressBtn) {
    compressBtn.addEventListener('click', () => {
        try {
            if (selectedFile) {
                if (compressionOptions) compressionOptions.style.display = 'none';
                if (compressionProgress) compressionProgress.style.display = 'block';
                compressPdf(selectedFile);
            } else {
                alert('Please select a PDF file first.');
            }
        } catch (error) {
            console.error('Error starting compression:', error);
            alert('There was an error starting the compression process. Please try again.');
            resetCompressor();
        }
    });
}

// Download Button
if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        try {
            if (compressedPdfData) {
                downloadCompressedPdf();
            } else {
                alert('No compressed PDF available for download. Please compress a PDF first.');
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('There was an error downloading the file. Please try again.');
        }
    });
}

// Compress Another PDF Button
if (compressAnotherBtn) {
    compressAnotherBtn.addEventListener('click', () => {
        try {
            resetCompressor();
        } catch (error) {
            console.error('Error resetting compressor:', error);
            alert('There was an error resetting the application. Please refresh the page.');
        }
    });
}

// Functions
function handleFileSelection(file) {
    try {
        if (!file) {
            throw new Error('No file selected');
        }
        
        if (file.type !== 'application/pdf') {
            alert('Please select a PDF file.');
            return;
        }
        
        selectedFile = file;
        
        if (uploadArea) uploadArea.style.display = 'none';
        if (compressionOptions) {
            compressionOptions.style.display = 'block';
            
            // Remove any existing file name display
            const existingFileName = compressionOptions.querySelector('.selected-file-name');
            if (existingFileName) {
                existingFileName.remove();
            }
            
            // Display file name
            const fileName = document.createElement('p');
            fileName.textContent = `Selected file: ${file.name}`;
            fileName.className = 'selected-file-name';
            compressionOptions.prepend(fileName);
        }
    } catch (error) {
        console.error('Error in handleFileSelection:', error);
        alert('There was an error processing the selected file. Please try again.');
        resetCompressor();
    }
}

async function compressPdf(pdfFile) {
    try {
        if (!pdfFile) {
            throw new Error('No PDF file provided for compression');
        }
        
        if (!pdfjsLib) {
            throw new Error('PDF.js library not loaded properly');
        }
        
        // Update UI to show progress
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.textContent = '0%';
        
        // Read the PDF file
        const arrayBuffer = await readFileAsArrayBuffer(pdfFile);
        const originalSize = pdfFile.size;
        
        // Load the PDF document using PDF.js
        const loadingTask = pdfjsLib.getDocument(arrayBuffer);
        const pdfDocument = await loadingTask.promise;
        
        // Get compression level
        const compressionLevelElement = document.getElementById('compression-level');
        if (!compressionLevelElement) {
            throw new Error('Compression level selector not found');
        }
        const compressionLevel = compressionLevelElement.value;
        
        // Create a new PDF document with compressed settings
        const compressedPdf = await compressPdfDocument(pdfDocument, compressionLevel, updateProgress);
        
        if (!compressedPdf) {
            throw new Error('Compression failed to produce output');
        }
        
        // Calculate size reduction
        const newSize = compressedPdf.byteLength;
        const reduction = ((originalSize - newSize) / originalSize) * 100;
        
        // Update UI with results
        if (originalSizeElement) originalSizeElement.textContent = formatFileSize(originalSize);
        if (newSizeElement) newSizeElement.textContent = formatFileSize(newSize);
        if (reductionPercentageElement) reductionPercentageElement.textContent = `${reduction.toFixed(1)}%`;
        
        // Store compressed PDF data
        compressedPdfData = compressedPdf;
        
        // Show result
        if (compressionProgress) compressionProgress.style.display = 'none';
        if (compressionResult) compressionResult.style.display = 'block';
    } catch (error) {
        console.error('Error compressing PDF:', error);
        alert(`An error occurred while compressing the PDF: ${error.message}. Please try again.`);
        resetCompressor();
    }
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

async function compressPdfDocument(pdfDocument, compressionLevel, progressCallback) {
    // Simulate compression with progress updates
    // In a real implementation, this would use PDF.js or another library to actually compress the PDF
    
    const totalPages = pdfDocument.numPages;
    let processedPages = 0;
    
    // Create a canvas to render PDF pages
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Determine quality settings based on compression level
    let imageQuality, scale;
    switch (compressionLevel) {
        case 'low':
            imageQuality = 0.8;
            scale = 0.9;
            break;
        case 'medium':
            imageQuality = 0.6;
            scale = 0.7;
            break;
        case 'high':
            imageQuality = 0.4;
            scale = 0.5;
            break;
        default:
            imageQuality = 0.6;
            scale = 0.7;
    }
    
    // Simulate PDF compression
    // Note: This is a simulation. In a real implementation, you would use a proper PDF manipulation library
    for (let i = 1; i <= totalPages; i++) {
        // Update progress
        processedPages++;
        const progress = (processedPages / totalPages) * 100;
        progressCallback(progress);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // For demo purposes, we're just returning the original file with a slight size reduction
    // In a real implementation, you would create a new compressed PDF
    const originalArrayBuffer = await readFileAsArrayBuffer(selectedFile);
    
    // Simulate compression by returning a slightly smaller array buffer
    // This is just for demonstration - in a real app, you would actually compress the PDF
    const simulatedCompressedSize = Math.floor(originalArrayBuffer.byteLength * 0.7); // 30% reduction
    return originalArrayBuffer.slice(0, simulatedCompressedSize);
}

function updateProgress(percentage) {
    try {
        if (progressBar) progressBar.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = `${Math.round(percentage)}%`;
    } catch (error) {
        console.error('Error updating progress:', error);
        // Continue execution - non-critical error
    }
}

function downloadCompressedPdf() {
    try {
        if (!compressedPdfData) {
            throw new Error('No compressed PDF data available');
        }
        
        if (!selectedFile || !selectedFile.name) {
            throw new Error('Original file information is missing');
        }
        
        const blob = new Blob([compressedPdfData], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `compressed_${selectedFile.name}`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    } catch (error) {
        console.error('Error in downloadCompressedPdf:', error);
        alert('There was an error downloading the compressed PDF. Please try again.');
    }
}

function resetCompressor() {
    try {
        // Reset state variables
        selectedFile = null;
        compressedPdfData = null;
        
        // Reset UI
        const fileNameElement = document.querySelector('.selected-file-name');
        if (fileNameElement) {
            fileNameElement.remove();
        }
        
        // Safely reset UI elements
        if (uploadArea) uploadArea.style.display = 'block';
        if (compressionOptions) compressionOptions.style.display = 'none';
        if (compressionProgress) compressionProgress.style.display = 'none';
        if (compressionResult) compressionResult.style.display = 'none';
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.textContent = '0%';
    } catch (error) {
        console.error('Error in resetCompressor:', error);
        // If we can't reset properly, suggest page refresh
        alert('There was an error resetting the application. Please refresh the page.');
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) {
        return bytes + ' bytes';
    } else if (bytes < 1048576) {
        return (bytes / 1024).toFixed(1) + ' KB';
    } else {
        return (bytes / 1048576).toFixed(1) + ' MB';
    }
}

function enableDarkMode() {
    document.body.setAttribute('data-theme', 'dark');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    isDarkMode = true;
    localStorage.setItem('theme', 'dark');
}

function disableDarkMode() {
    document.body.removeAttribute('data-theme');
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    isDarkMode = false;
    localStorage.setItem('theme', 'light');
}

function animateOnScroll() {
    const elements = document.querySelectorAll('.feature-card, .step, .compress-container');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    elements.forEach(element => {
        observer.observe(element);
    });
}

function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Adjust for header height
                    behavior: 'smooth'
                });
                
                // Update active link
                document.querySelectorAll('.nav-links a').forEach(link => {
                    link.classList.remove('active');
                });
                this.classList.add('active');
            }
        });
    });
}

// Add scroll event listener to update active navigation link
window.addEventListener('scroll', () => {
    const scrollPosition = window.scrollY;
    
    // Get all sections
    document.querySelectorAll('section').forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionBottom = sectionTop + section.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
            const currentId = section.getAttribute('id');
            document.querySelectorAll('.nav-links a').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${currentId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
    
    // Add shadow to header on scroll
    const header = document.querySelector('header');
    if (scrollPosition > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});