// static/script.js

var pointsRelativePosition = [];

var image = document.getElementById('base-image');
var canvas = document.getElementById('overlay-canvas');

function drawPoint(x, y) {
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2, true);
    ctx.fill();
}

function submitPoints() {
    var imageContainer = document.querySelector('.image-container');
    var imageId = imageContainer.getAttribute('data-image-id');
    var xhr = new XMLHttpRequest();
    var originalWidth = image.naturalWidth;
    var originalHeight = image.naturalHeight;
    var points = pointsRelativePosition.map(function(point) {
        return {
            x: point.x * originalWidth,
            y: point.y * originalHeight
        };
    });

    xhr.open('POST', '/submit_points', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ points: points, image_id: imageId }));

    xhr.onload = function() {
        if (xhr.status === 200) {
            var response = JSON.parse(xhr.responseText);
            displaySegmentedImages(response.segmented_images);
        } else {
            // Handle error
            alert("Error submitting points");
        }
    };
}

function clearPoints() {
    var canvas = document.getElementById('overlay-canvas');
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pointsRelativePosition = [];
}

function displaySegmentedImages(imageUrls) {
    var container = document.getElementById('segmented-images-container');
    container.innerHTML = ''; // Clear existing content
    imageUrls.forEach(function(url) {
        var img = document.createElement('img');
        var timestamp = new Date().getTime(); // Get current timestamp
        img.src = url + '?t=' + timestamp; // Append timestamp to URL
        container.appendChild(img);
    });
}


function drawAllPoints() {
    var canvasWidth = canvas.offsetWidth;
    var canvasHeight = canvas.offsetHeight;
    pointsRelativePosition.forEach(function(point) {
        drawPoint(point.x * canvasWidth, point.y * canvasHeight);
    });
}

function repositionCanvas(){
    //make canvas same as image, which may have changed size and position
    canvas.height = image.height;
    canvas.width = image.width;
    canvas.style.top = image.offsetTop + "px";;
    canvas.style.left = image.offsetLeft + "px";
    drawAllPoints();
}

function initCanvas(){
canvas.height = image.height;
canvas.width = image.width;
canvas.style.top = image.offsetTop + "px";;
canvas.style.left = image.offsetLeft + "px";}

function init(){
initCanvas();
}
  

// Event listeners
window.addEventListener('load',init)
window.addEventListener('resize',repositionCanvas)

canvas.addEventListener('click', function(event) {
    var x = event.pageX - canvas.offsetLeft;
    var y = event.pageY - canvas.offsetTop;
    var canvasWidth = canvas.offsetWidth;
    var canvasHeight = canvas.offsetHeight;
    drawPoint(x, y);
    pointsRelativePosition.push({x: x / canvasWidth, y: y / canvasHeight});
});

document.getElementById('submit-points').addEventListener('click', function() {
    submitPoints();
});

document.getElementById('clear-points').addEventListener('click', function() {
    clearPoints();
});
