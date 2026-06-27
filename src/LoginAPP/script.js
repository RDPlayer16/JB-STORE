/* eslint-disable no-unused-vars */
// Pegar os elementos DOM
const formulario = document.getElementById("meuFormulario");
const inputNome = document.getElementById("nome");
const inputSobrenome = document.getElementById("sobrenome");
const inputEmail = document.getElementById("email");
const inputSenha = document.getElementById("senha");
const passwordStatus = document.getElementById("password-status");
const inputCPF = document.getElementById("cpf");

// Funções auxiliares
const adicionarErro = (element) => {
    element.parentElement.classList.add("erro");
}

const removerErro = (element) => {
    element.parentElement.classList.remove("erro");
}

// Função para validar texto
const validaInputText = (input) => {
    if (input.value.trim() === "") {
        adicionarErro(input);
        return false;
    }
    removerErro(input);
    return true;
}

// Função para validar email
const validaEmail = () => {
    if (inputEmail.value.trim() === "") {
        adicionarErro(inputEmail);
        return false;
    }
    removerErro(inputEmail);
    return true;
}

// Função para verificar a força da senha
const verificaForcaSenha = (senha) => {
    const numeros = /\d/;
    const alfabeto = /[a-zA-Z]/;
    const chEspeciais = /[~!@#$%^&*-_+=?<>]/;

    if (senha.length < 6) {
        return "Fraco, insira no mínimo 6 caracteres";
    } else if (numeros.test(senha) && alfabeto.test(senha) && chEspeciais.test(senha)) {
        return "Forte!";
    } else {
        return "Média, adicione um caracter especial";
    }
}

// Função para validar senha
const validaSenha = () => {
    const forca = verificaForcaSenha(inputSenha.value);
    passwordStatus.textContent = forca;
    passwordStatus.style.color = forca === "Forte!" ? "green" : "red";
}

// Função para validar o formulário
const validarFormulario = () => {
    return validaInputText(inputNome) && validaInputText(inputSobrenome);
}

// Atribuição de eventos aos respectivos inputs e formulário
inputSenha.addEventListener("input", validaSenha);

formulario.addEventListener("submit", (event) => {
    if (!validarFormulario()) {
        event.preventDefault();
    }
});
