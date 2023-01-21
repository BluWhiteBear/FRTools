document.getElementById("input-bike").addEventListener("change", changeBike);
let bikeSelectionIcon = document.getElementById("bikeSelection");
let darkBikes = ["Images/bike.png", "Images/bike_no.png", "Images/bike_loan.png"];
let lightBikes = ["Images/bike_light.png", "Images/bike_no_light.png", "Images/bike_loan_light.png"];
let mintBikes = ["Images/bike_mint.png", "Images/bike_no_mint.png", "Images/bike_loan_mint.png"];
let selectedBikeColor;

changeBike()

function changeBike()
{
    let bikeIndex = document.getElementById("input-bike").selectedIndex;

    switch(displayMode)
    {
        case 0:

            selectedBikeColor = darkBikes;
            console.log(1);
            break;
        
        case 1:

            selectedBikeColor = lightBikes;
            console.log(2);
            break;
        
        case 2:

            selectedBikeColor = mintBikes;
            console.log(3);
            break;
    }

    switch(bikeIndex)
    {
        case 0:
            bikeSelectionIcon.src = selectedBikeColor[0];
            console.log("Option 1");
            break;

        case 1:
            bikeSelectionIcon.src = selectedBikeColor[1];
            console.log("Option 2");
            break;

        case 2:
            bikeSelectionIcon.src = selectedBikeColor[2];
            console.log("Option 3");
            break;
    }
    console.log("Function called");
}