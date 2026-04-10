// Shows a dismissible alert with the given message.
function showAlert(message)
{
    const container = document.getElementById('alert-container');
    container.querySelector('.alert-content').textContent = message;
    container.style.display = 'block';
}

// Hides the alert.
function hideAlert()
{
    document.getElementById('alert-container').style.display = 'none';
}

// Encode a UTF-8 string to Base64.
// Uses TextEncoder so all Unicode characters are handled correctly.
function encodeToBase64(text)
{
    const bytes = new TextEncoder().encode(text);
    const binString = Array.from(bytes, b => String.fromCodePoint(b)).join('');

    return btoa(binString);
}

// Decode a Base64 string back to UTF-8 text.
// Throws a descriptive error if the input is not valid Base64.
function decodeFromBase64(b64)
{
    // Strip whitespace so copy-pasted / line-wrapped Base64 still works
    const cleaned = b64.replace(/\s/g, '');
    let binString;

    try
    {
        binString = atob(cleaned);
    } 
    catch
    {
        throw new Error('Invalid Base64 input. Make sure there are no missing or extra characters.');
    }

    const bytes = Uint8Array.from(binString, c => c.codePointAt(0));

    return new TextDecoder().decode(bytes);
}

// Event listeners for buttons
// Encode Button - encodes the input text to Base64 and displays it in the output area.
document.getElementById('encodeBtn').addEventListener('click', () => {
    hideAlert();

    const input = document.getElementById('inputText').value;

    if (!input.trim())
    {
        showAlert('Please enter some text to encode.');
        return;
    }

    document.getElementById('outputText').value = encodeToBase64(input);
});

// Decode Button - decodes the input Base64 string back to UTF-8 text and displays it in the output area.
document.getElementById('decodeBtn').addEventListener('click', () => {
    hideAlert();

    const input = document.getElementById('inputText').value;

    if (!input.trim())
    {
        showAlert('Please enter a Base64 string to decode.');
        return;
    }
    try
    {
        document.getElementById('outputText').value = decodeFromBase64(input);
    }
    catch (err)
    {
        showAlert(err.message);
    }
});

// Swap Button - swaps the content of the input and output areas.
document.getElementById('swapBtn').addEventListener('click', () => {
    hideAlert();

    const inputEl = document.getElementById('inputText');
    const outputEl = document.getElementById('outputText');
    const temp = inputEl.value;

    inputEl.value = outputEl.value;
    outputEl.value = temp;
});

// Clear Button - clears both the input and output areas.
document.getElementById('clearBtn').addEventListener('click', () => {
    hideAlert();

    document.getElementById('inputText').value = '';
    document.getElementById('outputText').value = '';
});

// Copy Button - copies the output text to the clipboard and shows a temporary success message.
document.getElementById('copyBtn').addEventListener('click', () => {
    const output = document.getElementById('outputText').value;

    if (!output) return;

    navigator.clipboard.writeText(output).then(() => {
        const btn = document.getElementById('copyBtn');
        const original = btn.innerHTML;

        btn.innerHTML = '<i class="bi bi-check me-1"></i>Copied!';
        btn.classList.replace('btn-secondary', 'btn-success');
        
        setTimeout(() => {
            btn.innerHTML = original;
            btn.classList.replace('btn-success', 'btn-secondary');
        }, 1500);
    });
});
