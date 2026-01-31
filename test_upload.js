// 🧪 Test File for JS Playground Upload Feature

console.log("----------------------------------------");
console.log("✅ File Upload Successful!");
console.log("----------------------------------------");

// 1. Simple Math Test
const a = 10;
const b = 25;
console.log(`Testing Math: ${a} + ${b} = ${a + b}`);

// 2. Loop Test
console.log("Counting to 5:");
for (let i = 1; i <= 5; i++) {
    console.log(`  Count: ${i}`);
}

// 3. Object Test
const user = {
    name: "Tester",
    role: "Developer",
    active: true
};
console.log("User Info:", user);

// 4. Async Test (wait 2 seconds)
console.log("⏳ Starting 2-second timer...");
setTimeout(() => {
    console.log("🎉 Timer finished! Async works.");
}, 2000);
