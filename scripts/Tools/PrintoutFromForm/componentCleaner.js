class ComponentCleaner 
{
    static cleanComponent(component) 
    {
        // ! EARLY EXIT
        // ? Check if component is valid
        if (!component) return component;

        // ? Properties to remove from all components
        const propsToRemove = [
            'serverScript',
            'clientScript',
            'customConditional',
            'conditional'
        ];

        // ? Create a copy of the component
        let cleanedComponent = { ...component };

        // ? Remove specified properties
        propsToRemove.forEach(prop => {
            delete cleanedComponent[prop];
        });

        // ? Recursively clean nested components (if any)
        if (cleanedComponent.components && Array.isArray(cleanedComponent.components)) 
        {
            cleanedComponent.components = cleanedComponent.components.map(c => this.cleanComponent(c));
        }

        // ? Clean columns if they exist
        if (cleanedComponent.columns && Array.isArray(cleanedComponent.columns))
        {
            cleanedComponent.columns = cleanedComponent.columns.map(column => {
                if (column.components && Array.isArray(column.components))
                {
                    return {
                        ...column,
                        components: column.components.map(c => this.cleanComponent(c))
                    };
                }

                return column;
            });
        }

        return cleanedComponent;
    }
}