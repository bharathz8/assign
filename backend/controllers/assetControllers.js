async function addExtractedAssets(fileId, fileName, documentType, extractedData) {
  try {
    if (!extractedData || !extractedData.success) {
      return { success: false, message: 'No valid data to save' };
    }
    
    const data = extractedData.data;
    let assetData;
    
    switch (documentType) {
      case 'bank_statement':
        assetData = {
          source: 'document',
          assetType: 'bank_account',
          name: data.bank_name,
          identifierNumber: data.account_number,
          accountType: data.account_type,
          balance: data.closing_balance,
          extractedFrom: {
            fileId,
            fileName
          }
        };
        break;
        
      case 'insurance_policy':
        assetData = {
          source: 'document',
          assetType: 'insurance_policy',
          name: data.insurer_name,
          identifierNumber: data.policy_number,
          insuredAmount: data.sum_assured,
          premiumAmount: data.premium_amount,
          startDate: data.start_date,
          endDate: data.end_date,
          extractedFrom: {
            fileId,
            fileName
          }
        };
        break;
        
      case 'vehicle_policy':
        assetData = {
          source: 'document',
          assetType: 'vehicle_policy',
          name: data.insurer_name,
          identifierNumber: data.policy_number,
          insuredAmount: data.insured_amount,
          premiumAmount: data.premium_amount,
          vehicleDetails: {
            vehicleNumber: data.vehicle_number,
            make: data.vehicle_make,
            model: data.vehicle_model,
            chassisNumber: data.chassis_number,
            engineNumber: data.engine_number
          },
          extractedFrom: {
            fileId,
            fileName
          }
        };
        break;
        
      default:
        return { success: false, message: 'Unknown document type' };
    }
    
    // Check if we have enough data to add
    if (!assetData.name || (!assetData.identifierNumber && documentType !== 'bank_statement')) {
      return { success: false, message: 'Insufficient data extracted' };
    }
    
    // Check for duplicates
    const isDuplicate = await isAssetDuplicate(assetData);
    if (isDuplicate) {
      return { success: false, message: 'Asset already exists in database' };
    }
    
    // Save to database
    const newAsset = new Asset(assetData);
    await newAsset.save();
    
    return {
      success: true,
      message: 'Asset saved successfully',
      asset: newAsset
    };
  } catch (error) {
    console.error('Error adding extracted asset:', error);
    return { success: false, message: error.message };
  }
}