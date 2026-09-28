const fs = require('fs');
let code = fs.readFileSync('js/state/store.js', 'utf8');

code = code.replace(/calendarMonthDays:\s*\[[\s\S]*?\],/, `calendarMonthDays: Array.from({length: 30}, (_, i) => ({ day: i + 1, status: 'pending', completed: 0, total: 5, latency: 0, notes: "Upcoming" })),`);
code = code.replace(/tasks:\s*\[[\s\S]*?\],\s*familiarPeople:/, `tasks: [],\n\n      familiarPeople:`);
code = code.replace(/familiarPeople:\s*\[[\s\S]*?\],\s*caregiverAlerts:/, `familiarPeople: [],\n      caregiverAlerts:`);
code = code.replace(/caregiverAlerts:\s*\[[\s\S]*?\],\s*caregiverDoctorNotes:/, `caregiverAlerts: [],\n      caregiverDoctorNotes:`);
code = code.replace(/caregiverDoctorNotes:\s*\[[\s\S]*?\],\s*doctorDirectives:/, `caregiverDoctorNotes: [],\n      doctorDirectives:`);
code = code.replace(/doctorDirectives:\s*\[[\s\S]*?\]\s*\n\s*};/, `doctorDirectives: []\n    };`);

fs.writeFileSync('js/state/store.js', code);
console.log('Dummy data cleared.');
