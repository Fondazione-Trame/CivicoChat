const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const errorMsg = document.getElementById('error-msg');
const registerErrorMsg = document.getElementById('register-error');
const registerSuccessMsg = document.getElementById('register-success');
const loginContainer = document.getElementById('login-container');
const registerContainer = document.getElementById('registerContainer');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const API_URL = 'https://civicochat.pingumc.com/api';

loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginContainer.style.display = 'block';
    registerContainer.style.display = 'none';
    errorMsg.textContent = '';
    registerErrorMsg.textContent = '';
});

registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerContainer.style.display = 'block';
    loginContainer.style.display = 'none';
    errorMsg.textContent = '';
    registerErrorMsg.textContent = '';
});

document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (token && currentUser) {
        window.location.href = "home.html";
    }
});

loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    errorMsg.textContent = "";

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Si è verificato un errore');
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));

        window.location.href = "home.html";
    } catch (error) {
        errorMsg.textContent = "Credenziali non valide. Riprova.";
    }
});

registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    registerErrorMsg.textContent = "";
    registerSuccessMsg.textContent = "";

    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (username.length < 3) {
        registerErrorMsg.textContent = "Lo username deve avere almeno 3 caratteri";
        return;
    }

    if (password.length < 6) {
        registerErrorMsg.textContent = "La password deve avere almeno 6 caratteri";
        return;
    }

    if (password !== confirmPassword) {
        registerErrorMsg.textContent = "Le password non corrispondono";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Si è verificato un errore');
        }

        registerSuccessMsg.textContent = "Registrazione completata! Ora puoi accedere.";
        registerForm.reset();

        setTimeout(() => {
            loginTab.click();
        }, 2000);
    } catch (error) {
        registerErrorMsg.textContent = error.message || "Errore durante la registrazione. Riprova.";
    }
});