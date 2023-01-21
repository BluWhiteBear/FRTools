//Calls the getNewStyle function once the page finishes loading
getNewStyle();

//Creates an event listener that calls the changeStyle function on option change
document.getElementById("displayMode").addEventListener("change", changeStyle);

//Retrieves theme index from localStorage
function getNewStyle()
{
    //Gets saved value from LocalStorage
    var updatedStyleIndex = localStorage.getItem('displayMode');

    //Calls the setStyle function
    setStyle(updatedStyleIndex);
}






//Applies theme based on saved index
function setStyle(styleIn)
{
    //Sets the saved variable to the users' current selection
    displayMode = parseInt(styleIn);

    //Saves the value of selected index to localStorage
    localStorage.setItem('displayMode', displayMode);

    //Variable declaration for img elements with themed variants
    let MastheadImage = document.getElementById('MastheadImage');
    let mainlogo = document.getElementById('IntroIcon');

    //Updates the selected option of theme drop down to value saved in localStorage
    document.getElementById("displayMode").selectedIndex = displayMode;

    //Switch changes CSS variables and image sources based on index of drop down saved in localStorage
    switch (displayMode)
    {
        case 0:
            //Applies CSS variable values for selected theme
            setDarkCSSVariables();

            //Varifies that the img elements exist on the current page
            if(typeof(MastheadImage) != 'undefined' || MastheadImage != null)
            {
                setDarkImageSources(MastheadImage, mainlogo);
                break;
            }
            else
            {
                break;
            }

        case 1:
            //Applies CSS variable values for selected theme
            setLightCSSVariables();

            //Varifies that the img elements exist on the current page
            if(typeof(MastheadImage) != 'undefined' || MastheadImage != null)
            {
                setLightImageSources(MastheadImage, mainlogo);
                break;
            }
            else
            {
                break;
            }

        case 2:
            //Applies CSS variable values for selected theme
            setMintCSSVariables();

            //Varifies that the img elements exist on the current page
            if(typeof(MastheadImage) != 'undefined' || MastheadImage != null)
            {
                setMintImageSources(MastheadImage, mainlogo);
                break;
            }
            else
            {
                break;
            }
    }

    //Logs that a theme change has occured
    console.log("Theme changed...");
}






//Applies theme based on user's drop down selection
function changeStyle()
{
    //Stores the new drop down selection index
    let styleIndex = document.getElementById('displayMode').selectedIndex;

    //Calls the setStyle function
    setStyle(styleIndex);
}











//Applies Dark Theme CSS variables
function setDarkCSSVariables()
{
    document.documentElement.style.setProperty('--primary-background-color', '#292D45');
    document.documentElement.style.setProperty('--primary-background-color2', '#161929');
    document.documentElement.style.setProperty('--secondary-background-color', '#5F6986');
    document.documentElement.style.setProperty('--secondary-background-color2', '#1D2232');
    document.documentElement.style.setProperty('--nav-color', '#FFFFFF');
    document.documentElement.style.setProperty('--accent-color', '#DB415B');
    document.documentElement.style.setProperty('--primary-text-color', '#EAEAF0');
    document.documentElement.style.setProperty('--secondary-text-color', '#333333');
}

//Applies Light Theme CSS variables
function setLightCSSVariables()
{
    document.documentElement.style.setProperty('--primary-background-color', '#E4E5E9');
    document.documentElement.style.setProperty('--primary-background-color2', '#E4E5E9');
    document.documentElement.style.setProperty('--secondary-background-color', '#fdfdfd');
    document.documentElement.style.setProperty('--secondary-background-color2', '#dfdfdf');
    document.documentElement.style.setProperty('--nav-color', '#000000');
    document.documentElement.style.setProperty('--accent-color', '#DB415B');
    document.documentElement.style.setProperty('--primary-text-color', '#000000');
    document.documentElement.style.setProperty('--secondary-text-color', '#ffffff');
}

//Applies Mint Theme CSS variables
function setMintCSSVariables()
{
    document.documentElement.style.setProperty('--primary-background-color', '#475C4D');
    document.documentElement.style.setProperty('--primary-background-color2', '#475C4D');
    document.documentElement.style.setProperty('--secondary-background-color', '#E5EDE3');
    document.documentElement.style.setProperty('--secondary-background-color2', '#E5EDE3');
    document.documentElement.style.setProperty('--nav-color', '#213126');
    document.documentElement.style.setProperty('--accent-color', '#00E59B');
    document.documentElement.style.setProperty('--primary-text-color', '#213126');
    document.documentElement.style.setProperty('--secondary-text-color', '#333333');
}










//Applies Dark Theme img variants 
function setDarkImageSources(MastheadImage, mainlogo)
{
    MastheadImage.src = "Images/banner.png";
    mainlogo.src = "Images/site_logo.png";
    //changeBike();
}

//Applies Dark Theme img variants 
function setLightImageSources(MastheadImage, mainlogo)
{
    MastheadImage.src = "Images/banner_light.png";
    mainlogo.src = "Images/site_logo_light.png";
    //changeBike();
}

//Applies Dark Theme img variants 
function setMintImageSources(MastheadImage, mainlogo)
{
    MastheadImage.src = "Images/banner_mint.png";
    mainlogo.src = "Images/site_logo_mint.png";
    //changeBike();
}