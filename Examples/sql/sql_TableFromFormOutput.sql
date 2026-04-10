CREATE TABLE [dbo].[ct_FormIO_FormIO2DevExpressTestForm1] (
    [txtUnnestedField1] VARCHAR(255) NULL,
    [txtUnnestedField2] VARCHAR(255) NULL,
    [txtaUnnestedField3] VARCHAR(MAX) NULL,

    [txtTextField] VARCHAR(255) NULL,
    [txtaTextArea] VARCHAR(MAX) NULL,
    [txtNumber] INT NULL,
    [chkCheckbox] BIT NULL,
    [cmbSelect] VARCHAR(100) NULL,
    -- rdoRadio missing

    -- txtEmail missing
    -- txtURL missing
    -- txtPhoneNumber missing
    -- txtAddress missing, but does contain the below subfields
        [address1] VARCHAR(255) NULL,
        [address2] VARCHAR(255) NULL,
        [city] VARCHAR(255) NULL,
        [state] VARCHAR(255) NULL,
        [country] VARCHAR(255) NULL,
        [zip] VARCHAR(255) NULL,

    [txtDateTime] DATETIME NULL,

    -- txtDay missing
    -- txtTime missing
    -- txtCurrency missing
    -- sigSignature missing

    -- txtColumn1Field1 missing
    -- txtColumn1Field2 missing
    -- txtColumn2Field1 missing
    -- chkColumn2Field2 missing

    [txtFieldsetField1] VARCHAR(255) NULL,
    [txtaFieldsetField2] VARCHAR(MAX) NULL,
    [chkFieldsetField3] BIT NULL,

    [txtPanelField1] VARCHAR(255) NULL,
    [cmbPanelField2] VARCHAR(100) NULL,

    [textField] VARCHAR(255) NULL,
    [textField1] VARCHAR(255) NULL,
    [textField2] VARCHAR(255) NULL,
    [textField3] VARCHAR(255) NULL,
    [textField4] VARCHAR(255) NULL,
    [textField5] VARCHAR(255) NULL,

    -- standardRadio missing
    -- radio1 missing

    [topSelect] VARCHAR(100) NULL,
    [leftSelect] VARCHAR(100) NULL,

    [hiddenLabel] VARCHAR(255) NULL,
    [hiddenLabelTextArea] VARCHAR(MAX) NULL,
    [hiddenLabelNumber] INT NULL,
    [hiddenLabelCheckbox] BIT NULL,
    [hiddenLabelSelect] VARCHAR(100) NULL,

    -- hiddenLabelRadio missing

    -- hiddenLabelEmail missing
    -- hiddenLabelUrl missing
    -- hiddenLabelPhoneNumber missing

    -- hiddenLabelAddress missing, but does contain the below subfields
        [address1] VARCHAR(255) NULL,
        [address2] VARCHAR(255) NULL,
        [city] VARCHAR(255) NULL,
        [state] VARCHAR(255) NULL,
        [country] VARCHAR(255) NULL,
        [zip] VARCHAR(255) NULL,

    [hiddenLabelDateTime] DATETIME NULL

    -- hiddenLabelCurrency missing
    -- hiddenLabelSignature missing
);
GO