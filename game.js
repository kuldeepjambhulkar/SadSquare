// Update colors for game elements
const colors = {
    lava: "#FFA500", // Orange
    hero: "#00FFFF", // Aqua
    rope: "#00FFFF", // Aqua
    bricks: "#FFD700", // Gold
    heart: "#800080", // Red for the heart
    evilBricks: "#FF0000", // Red for evil bricks
    lifeBrick: "#800080" // Purple for life brick
};
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
// Set canvas dimensions based on window size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const sceneHeight = canvas.height;
const lavaHeight = sceneHeight * 0.25;
const heroSize = 30;
const brickSize = 50;
let isPaused = false;
const HUD_HEIGHT = 100; // Height of the HUD (Score and Life)
let hero = {
    x: Math.random() * (canvas.width - heroSize),
    y: Math.random() * (canvas.height - lavaHeight - heroSize),
    size: heroSize,
    speed: 2,
    life: 3
};

let bricks = [];
let score = 0; 
let lastCollisionPosition = { x: 0, y: 0 };
const minBrickCount = 5; // Minimum number of bricks to maintain on the screen

let isHeroBeingPulled = false;
let targetBrick = null;
let pullDuration = 500; // Duration of the pull animation in milliseconds
let pullStartTime;

let isRopeVisible = false;
let ropeTargetBrick = null;

let isCollisionEffectVisible = false;
let collisionEffectPosition = { x: 0, y: 0 };
let collisionEffectRadius = 20;
let collisionEffectStartTime;

const maxPopCircles = 10; // Maximum number of popping circles
const popCircleRadius = 5; // Radius of each popping circle
const popDuration = 2000; // Duration of the popping animation in milliseconds
let popCircles = [];

// Function to handle pause and resume
function togglePause() {
    isPaused = !isPaused;

    if (isPaused) {
        // Stop the game loop
        cancelAnimationFrame(animationId);
    } else {
        // Resume the game loop
        gameLoop();
    }
}

// Create a text element to display the score and life
function drawHUD() {
    // Display score
    ctx.fillStyle = "#FFFFFF"; // Set text color to white
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score, 10, 30); // Display score in the top left corner

    // Display life
    ctx.fillStyle = colors.heart;
    for (let i = 0; i < hero.life; i++) {
        ctx.fillRect(10 + i * 30, 40, 20, 20); // Draw hearts next to each other
    }

     // Draw pause button
     ctx.fillStyle = "#FFFFFF";
     ctx.fillRect(10, 70, 30, 30);
 
    // Draw pause icon (two vertical bars)
    ctx.fillStyle = "#000000";
    ctx.fillRect(15, 75, 5, 20);  // Adjusted y-coordinate to 75
    ctx.fillRect(25, 75, 5, 20);  // Adjusted y-coordinate to 75

}

function createBrick() {
    const randomValue = Math.random();
    let selectedBrickType;

    // Adjust the probabilities to control the quantity of each brick type
    if (randomValue < 0.6) {
        // 60% chance for normal brick
        selectedBrickType = 'normalBrick';
    } else if (randomValue < 0.8) {
        // 20% chance for evil brick
        selectedBrickType = 'evilBrick';
    } else {
        // 20% chance for life brick
        selectedBrickType = 'lifeBrick';
    }

    let newBrick;

    switch (selectedBrickType) {
        case 'normalBrick':
            newBrick = createNonOverlappingBrick();
            newBrick.isEvil = false;
            newBrick.isLifeBrick = false;
            break;
        case 'evilBrick':
            newBrick = createNonOverlappingBrick();
            newBrick.isEvil = true;
            newBrick.isLifeBrick = false;
            break;
        case 'lifeBrick':
            newBrick = createNonOverlappingBrick();
            newBrick.isEvil = false;
            newBrick.isLifeBrick = true;
            break;
    }

    // Check for overlap with existing bricks
    function createNonOverlappingBrick() {
        const newBrick = {
            x: Math.random() * (canvas.width - brickSize),
            y: Math.random() * (canvas.height - lavaHeight - brickSize - HUD_HEIGHT),
            size: 1,  // Initial size (small)
        };

        let overlap = false;
        for (const existingBrick of bricks) {
            if (
                newBrick.x < existingBrick.x + existingBrick.size &&
                newBrick.x + newBrick.size > existingBrick.x &&
                newBrick.y < existingBrick.y + existingBrick.size &&
                newBrick.y + newBrick.size > existingBrick.y
            ) {
                overlap = true;
                break;
            }
        }

        // If overlap, recursively call createNonOverlappingBrick to generate a new one
        if (overlap) {
            return createNonOverlappingBrick();
        }

        return newBrick;
    }

    // Add the new brick to the bricks array
    bricks.push(newBrick);

    // Apply size growth animation
    const growthDuration = 1000;  // Duration of the growth animation in milliseconds
    const startTime = Date.now();

    function growthAnimation() {
        const elapsed = Date.now() - startTime;
        if (elapsed < growthDuration) {
            // Gradually increase the size during the growth animation
            newBrick.size = (elapsed / growthDuration) * brickSize;
            requestAnimationFrame(growthAnimation);
        } else {
            // Ensure the size matches the final dimensions at the end of the growth animation
            newBrick.size = brickSize;
        }
    }

    growthAnimation();
}

// Add the following drawRope function
function drawRope(startPoint, endPoint) {
    ctx.strokeStyle = colors.rope; // Brown color for the rope
    ctx.lineWidth = 3;

    // Calculate the center points of hero and target brick
    const heroCenterX = startPoint.x + startPoint.size / 2;
    const heroCenterY = startPoint.y + startPoint.size / 2;
    const targetCenterX = endPoint.x + endPoint.size / 2;
    const targetCenterY = endPoint.y + endPoint.size / 2;

    // Draw a line (rope) between hero and target brick
    ctx.beginPath();
    ctx.moveTo(heroCenterX, heroCenterY);
    ctx.lineTo(targetCenterX, targetCenterY);
    ctx.stroke();
}

function drawCollisionEffect(x, y) {
    // Set up the popping circles
    popCircles = [];
    for (let i = 0; i < maxPopCircles; i++) {
        const angle = (i / maxPopCircles) * 2 * Math.PI;
        const offsetX = popCircleRadius * Math.cos(angle);
        const offsetY = popCircleRadius * Math.sin(angle);
        popCircles.push({
            x: x + offsetX,
            y: y + offsetY,
            startTime: Date.now(),
        });
    }
}

function drawScene() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw lava floor
    ctx.fillStyle = colors.lava;
    ctx.fillRect(0, canvas.height - lavaHeight, canvas.width, lavaHeight);

    // Draw hero square
    ctx.fillStyle = colors.hero;
    ctx.fillRect(hero.x, hero.y, hero.size, hero.size);

    for (const brick of bricks) {
        if (brick.isEvil) {
            ctx.fillStyle = colors.evilBricks;
        } else if (brick.isLifeBrick) {
            ctx.fillStyle = colors.lifeBrick;
        } else {
            ctx.fillStyle = colors.bricks;
        }
        ctx.fillRect(brick.x, brick.y, brick.size, brick.size);
    }

    // Draw the HUD (Score and Life)
    drawHUD();

    // Draw rope if visible
    if (isRopeVisible && false) {
        drawRope(hero, ropeTargetBrick);
    }
    // Draw popping circles if visible
    for (const popCircle of popCircles) {
        const elapsed = Date.now() - popCircle.startTime;
        if (elapsed < popDuration) {
            // Draw the popping circles during the pop animation
            const scaleFactor = 1 - elapsed / popDuration; // Gradually shrink the circles
            ctx.fillStyle = "#FF0000"; // Red color for the popping circles
            ctx.beginPath();
            ctx.arc(popCircle.x, popCircle.y, popCircleRadius * scaleFactor, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
}
function clearPopCircles() {
    popCircles = [];
}
function createCollisionEffect(x, y) {
    // Set up the collision effect
    isCollisionEffectVisible = true;
    collisionEffectPosition = { x, y };
    collisionEffectStartTime = Date.now();
}
function update() {
    // Update hero position (falling towards lava) if not being pulled
    if (!isHeroBeingPulled) {
        hero.y += hero.speed;
    } else {
        // Update hero position during pull animation
        const elapsed = Date.now() - pullStartTime;
        if (elapsed < pullDuration) {
            // Calculate intermediate position during the pull animation
            const progress = elapsed / pullDuration;
            hero.x = hero.x + (targetBrick.x + targetBrick.size / 2 - hero.size / 2 - hero.x) * progress;
            hero.y = hero.y + (targetBrick.y + targetBrick.size / 2 - hero.size / 2 - hero.y) * progress;
        } else {
            // End of pull animation
            isHeroBeingPulled = false;

            // Hide the rope when the pull animation ends
            isRopeVisible = false;

            // Clear popping circles when the pull animation ends
            clearPopCircles();
        }
    }

    // Check for collisions with bricks
    for (let i = 0; i < bricks.length; i++) {
        const brick = bricks[i];

        if (
            hero.x < brick.x + brick.size &&
            hero.x + hero.size > brick.x &&
            hero.y < brick.y + brick.size &&
            hero.y + hero.size > brick.y
        ) {
            // Collision with a brick
            bricks.splice(i, 1);
            createCollisionEffect(hero.x + hero.size / 2, hero.y + hero.size / 2); // Generate a collision effect
            if (brick.isEvil) {
                // If it's an evil brick, decrease hero's life
                shakeScene();
                hero.life--;
            } else if (brick.isLifeBrick) {
                // If it's a life brick, increase hero's life
                hero.life++;
                score += 20;
            } else {
                // If it's a normal brick, remove the brick and increase the score
                score += 10;
                if (score % 100 === 0) {
                    hero.life++;
                }
            }

            // Store the last collision position
            lastCollisionPosition = { x: hero.x, y: hero.y };

            // Handle hero's life reaching zero
            if (hero.life <= 0) {
                gameOver();
            } else {
                // If life is still remaining, reset hero position when a new brick is created
                hero.x = lastCollisionPosition.x;
                hero.y = lastCollisionPosition.y;
            }
            break;
        }
    }

    // Check if hero touches the lava floor
    if (hero.y + hero.size > canvas.height - lavaHeight) {
        hero.life--; // Decrease life when hero touches lava
        shakeScene();

        if (hero.life <= 0) {
            gameOver();
        } else {
            // If life is still remaining, reset hero position when a new brick is created
            hero.x = lastCollisionPosition.x;
            hero.y = lastCollisionPosition.y;
        }
    }

    // Check the number of bricks and create a new one if needed
    if (bricks.length < minBrickCount) {
        createBrick();
    }
}

function shakeScene() {
    const shakeAmount = 5;
    const shakeDuration = 500;
    
    const startTime = Date.now();

    function shake() {
        const elapsed = Date.now() - startTime;

        if (elapsed < shakeDuration) {
            const offsetX = (Math.random() - 0.5) * shakeAmount;
            const offsetY = (Math.random() - 0.5) * shakeAmount;
            
            ctx.translate(offsetX, offsetY);
            
            requestAnimationFrame(shake);
        } else {
            // Reset translation after the shake effect
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
    }

    shake();
}


let gameRunning = true;

function restartGame() {
    document.location.reload();
}

function quitGame() {
    window.close();
}

function gameOver() {
    gameRunning = false;
    const gameOverScreen = document.getElementById("gameOverScreen");
    const gameOverOverlay = document.getElementById("gameOverOverlay");
    gameOverScreen.style.display = "block";
    gameOverOverlay.style.display = "block";
}

// Initial game loop call
let animationId;

function gameLoop() {
    if (gameRunning && !isPaused) {
        update();
        drawScene();
        drawHUD();
        animationId = requestAnimationFrame(gameLoop);
    }
}

document.addEventListener("click", function (event) {
    const mouseX = event.clientX - canvas.getBoundingClientRect().left;
    const mouseY = event.clientY - canvas.getBoundingClientRect().top;
    if (
        mouseX > 10 && mouseX < 40 &&
        mouseY > 60 && mouseY < 90
    ) {
        togglePause();
    }
    // Check if the click is on any brick
    for (const brick of bricks) {
        if (
            mouseX > brick.x &&
            mouseX < brick.x + brick.size &&
            mouseY > brick.y &&
            mouseY < brick.y + brick.size
        ) {
            // Pull the hero towards the brick
            isHeroBeingPulled = true;
            targetBrick = brick;
            pullStartTime = Date.now();

            // Show the rope between hero and clicked brick
            isRopeVisible = true;
            ropeTargetBrick = brick;
            break;
        }
    }
});

// Create initial bricks
for (let i = 0; i < 5; i++) {
    createBrick();
}

gameLoop();
