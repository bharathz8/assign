export function containsRelevantInfo(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }
    
    const keywords = [
      'bank', 'statement', 'account', 'balance',
      'insurance', 'policy', 'premium', 'coverage', 'claim',
      'vehicle'
    ];
    
    text = text.toLowerCase();
    return keywords.some(keyword => text.includes(keyword.toLowerCase()));
  }

  export function isStaticFile(fileTextContent) {
    if (!fileTextContent || typeof fileTextContent !== 'string') {
      return false;
    }
    
    return staticItems.some(item => fileTextContent.includes(item));
  }

  
  export function classifyDocument(text) {
    if (!text || typeof text !== 'string') {
      return { type: 'unknown', confidence: 0 };
    }
    
    text = text.toLowerCase();
    
    // Track matches for classification
    const matches = {
      bank_statement: 0,
      insurance_policy: 0,
      vehicle_policy: 0
    };
    
    // Bank statement keywords
    const bankKeywords = [
      'account number', 'statement period', 'balance', 'deposit', 'withdrawal',
      'transaction', 'credit', 'debit', 'available balance', 'opening balance',
      'closing balance', 'bank statement', 'statement date', 'branch code'
    ];
    
    // Insurance policy keywords
    const insuranceKeywords = [
      'policy number', 'premium', 'coverage', 'insured amount', 'sum assured',
      'policy term', 'insurance policy', 'policy holder', 'beneficiary',
      'maturity date', 'insurance plan', 'claim', 'nominee'
    ];
    
    // Vehicle policy keywords
    const vehicleKeywords = [
      'vehicle insurance', 'car insurance', 'motor insurance', 'registration number',
      'vehicle number', 'chassis number', 'engine number', 'model', 'make',
      'vehicle details', 'third party', 'comprehensive', 'idv', 'insured value'
    ];
    
    // Count matches for each category
    bankKeywords.forEach(keyword => {
      if (text.includes(keyword)) matches.bank_statement++;
    });
    
    insuranceKeywords.forEach(keyword => {
      if (text.includes(keyword)) matches.insurance_policy++;
    });
    
    vehicleKeywords.forEach(keyword => {
      if (text.includes(keyword)) matches.vehicle_policy++;
    });
    
    // Find category with highest matches
    const categories = Object.keys(matches);
    const maxCategory = categories.reduce((a, b) => matches[a] > matches[b] ? a : b);
    
    // Calculate confidence (percentage of matched keywords)
    let maxKeywords;
    switch (maxCategory) {
      case 'bank_statement': maxKeywords = bankKeywords.length; break;
      case 'insurance_policy': maxKeywords = insuranceKeywords.length; break;
      case 'vehicle_policy': maxKeywords = vehicleKeywords.length; break;
      default: maxKeywords = 1;
    }
    
    const confidence = (matches[maxCategory] / maxKeywords) * 100;
    
    // Require minimum threshold to classify
    if (matches[maxCategory] < 3 || confidence < 15) {
      return { type: 'unknown', confidence: confidence };
    }
    
    return { type: maxCategory, confidence: confidence };
  }

 export function identifyDocumentType(text) {
    if (!text || typeof text !== 'string') {
      return 'unknown';
    }
    
    text = text.toLowerCase();
    
    // Bank statement specific patterns
    const bankPatterns = [
      /statement\s+(?:of|for)\s+(?:account|the\s+period)/i,
      /opening\s+balance[\s:]+[\d,\.]+/i,
      /closing\s+balance[\s:]+[\d,\.]+/i,
      /account\s+number[\s:]*\d+/i,
      /branch\s+code[\s:]*\d+/i
    ];
    
    // Insurance policy patterns
    const insurancePatterns = [
      /policy\s+(?:no|number|#)[\s:]*[\w\d-]+/i,
      /sum\s+(?:assured|insured)[\s:]*[\d,\.]+/i,
      /premium\s+(?:amount|payment)[\s:]*[\d,\.]+/i,
      /policy\s+term[\s:]*.+?(?:years|months)/i,
      /coverage\s+(?:details|summary)/i
    ];
    
    // Vehicle policy patterns
    const vehiclePatterns = [
      /vehicle\s+(?:no|number|reg|registration)[\s:]*[A-Z0-9\s-]+/i,
      /chassis\s+(?:no|number)[\s:]*[\w\d]+/i,
      /engine\s+(?:no|number)[\s:]*[\w\d]+/i,
      /make\s*[\/:]?\s*model[\s:]*[\w\d\s]+/i,
      /third\s+party|comprehensive\s+coverage/i
    ];
    
    // Check against patterns
    const bankMatches = bankPatterns.filter(pattern => pattern.test(text)).length;
    const insuranceMatches = insurancePatterns.filter(pattern => pattern.test(text)).length;
    const vehicleMatches = vehiclePatterns.filter(pattern => pattern.test(text)).length;
    
    // Determine document type based on highest pattern matches
    if (bankMatches > insuranceMatches && bankMatches > vehicleMatches) {
      return 'bank_statement';
    } else if (insuranceMatches > bankMatches && insuranceMatches > vehicleMatches) {
      return 'insurance_policy';
    } else if (vehicleMatches > bankMatches && vehicleMatches > insuranceMatches) {
      return 'vehicle_policy';
    } else {
      // If there's a tie or insufficient evidence
      return 'unknown';
    }
  }
  
 export function classifyFinancialDocument(text) {
    // Get keyword-based classification with confidence
    const keywordClassification = classifyDocument(text);
    
    // Get pattern-based classification
    const patternType = identifyDocumentType(text);
    
    // If both methods agree, high confidence
    if (keywordClassification.type === patternType && patternType !== 'unknown') {
      return {
        type: patternType,
        confidence: Math.min(100, keywordClassification.confidence + 20),
        method: 'combined'
      };
    }
    
    // If pattern method found a type but keywords didn't, prefer pattern
    if (patternType !== 'unknown' && keywordClassification.type === 'unknown') {
      return { type: patternType, confidence: 70, method: 'pattern' };
    }
    
    // If keyword method is confident enough, use it
    if (keywordClassification.confidence > 50) {
      return { ...keywordClassification, method: 'keyword' };
    }
    
    // Default to unknown if methods disagree and confidence is low
    return { type: 'unknown', confidence: 0, method: 'none' };
  }
  
  // Data extraction functions for different document types
  
  // Extract data from bank statements
 export function extractBankStatementData(text) {
    if (!text || typeof text !== 'string') {
      return { success: false, error: 'No text content provided' };
    }
    
    const data = {
      bank_name: null,
      account_number: null,
      account_type: null,
      branch_code: null,
      ifsc_code: null,
      statement_period: null,
      opening_balance: null,
      closing_balance: null
    };
    
    // Bank name extraction
    // Common Indian banks
    const bankNames = [
      'HDFC Bank', 'ICICI Bank', 'State Bank of India', 'SBI', 'Axis Bank', 
      'Kotak Mahindra Bank', 'Punjab National Bank', 'PNB', 'Bank of Baroda',
      'Union Bank of India', 'Canara Bank', 'IndusInd Bank', 'Yes Bank',
      'Federal Bank', 'IDFC First Bank', 'RBL Bank'
    ];
    
    // Try to find bank name in text
    for (const bank of bankNames) {
      const regex = new RegExp(bank.replace(/\s+/g, '\\s+'), 'i');
      if (regex.test(text)) {
        data.bank_name = bank;
        break;
      }
    }
    
    // Account number extraction (various formats)
    const accNumberPatterns = [
      /(?:account|a\/c)(?:\s+(?:no|number|#|:))?\s*[.:]\s*(\d[\d\s*-]{5,})/i,
      /(?:account|a\/c)\s*(?:number|no|#)?\s*(?:is|:|\s+)?\s*(\d[\d\s*-]{5,})/i,
      /(\d{2,4}[\s-]*\d{2,4}[\s-]*\d{2,4}[\s-]*\d{2,6})/
    ];
    
    for (const pattern of accNumberPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // Clean up the account number - remove spaces, asterisks, etc.
        data.account_number = match[1].replace(/[\s*-]/g, '');
        break;
      }
    }
    
    // Account type extraction
    const accountTypes = [
      'savings', 'current', 'salary', 'fixed deposit', 'fd', 'recurring deposit',
      'rd', 'nre', 'nro'
    ];
    
    for (const type of accountTypes) {
      const regex = new RegExp(`(?:account\\s+type|a\\/c\\s+type)\\s*(?:is|:|-)\\s*(${type})`, 'i');
      const altRegex = new RegExp(`(${type})\\s+account`, 'i');
      
      const match = text.match(regex) || text.match(altRegex);
      if (match && match[1]) {
        data.account_type = match[1].toLowerCase();
        break;
      }
    }
    
    // IFSC code extraction
    const ifscMatch = text.match(/ifsc(?:\s+code)?(?:\s*[:#]\s*|\s+is\s+|\s+)([A-Z]{4}\d{7})/i);
    if (ifscMatch && ifscMatch[1]) {
      data.ifsc_code = ifscMatch[1];
    }
    
    // Branch code extraction
    const branchMatch = text.match(/branch(?:\s+code)?(?:\s*[:#]\s*|\s+is\s+|\s+)(\d{3,})/i);
    if (branchMatch && branchMatch[1]) {
      data.branch_code = branchMatch[1];
    }
    
    // Statement period extraction
    const periodMatch = text.match(/(?:statement|stmt)(?:\s+period|\s+for)?\s*(?::|from)?\s*((?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})|(?:\w+\s+\d{1,2},?\s*\d{4}))\s*(?:to|[-–—])\s*((?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})|(?:\w+\s+\d{1,2},?\s*\d{4}))/i);
    if (periodMatch && periodMatch[1] && periodMatch[2]) {
      data.statement_period = `${periodMatch[1]} to ${periodMatch[2]}`;
    }
    
    // Balance extraction
    // Try various formats for opening balance
    const openingBalancePatterns = [
      /opening\s+balance\s*(?::|is|=|\s)\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i,
      /balance\s+(?:b\/f|brought\s+forward)\s*(?::|is|=|\s)\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i
    ];
    
    for (const pattern of openingBalancePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.opening_balance = match[1].replace(/,/g, '');
        break;
      }
    }
    
    // Try various formats for closing balance
    const closingBalancePatterns = [
      /closing\s+balance\s*(?::|is|=|\s)\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i,
      /balance\s+(?:c\/f|carried\s+forward)\s*(?::|is|=|\s)\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i
    ];
    
    for (const pattern of closingBalancePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.closing_balance = match[1].replace(/,/g, '');
        break;
      }
    }
    
    // Check if we extracted enough meaningful data
    const extractedFields = Object.values(data).filter(Boolean).length;
    const success = extractedFields >= 2; // At least bank name and account number
    
    return {
      success,
      data,
      confidence: Math.min(100, extractedFields * 15) // Simple confidence score based on fields extracted
    };
  }
  
  // Extract data from insurance policies
 export function extractInsuranceData(text) {
    if (!text || typeof text !== 'string') {
      return { success: false, error: 'No text content provided' };
    }
    
    const data = {
      insurer_name: null,
      policy_number: null,
      policy_type: null,
      insured_name: null,
      sum_assured: null,
      premium_amount: null,
      premium_frequency: null,
      start_date: null,
      end_date: null
    };
    
    // Insurance company names
    const insurerNames = [
      'LIC', 'Life Insurance Corporation', 'HDFC Life', 'SBI Life', 'ICICI Prudential',
      'Max Life', 'Bajaj Allianz', 'Aditya Birla', 'Kotak Life', 'Exide Life',
      'Star Health', 'HDFC ERGO', 'Bajaj Allianz General', 'ICICI Lombard',
      'New India Assurance', 'United India Insurance', 'Oriental Insurance',
      'National Insurance', 'Reliance General', 'Tata AIG'
    ];
    
    // Try to find insurer name in text
    for (const insurer of insurerNames) {
      const regex = new RegExp(insurer.replace(/\s+/g, '\\s+'), 'i');
      if (regex.test(text)) {
        data.insurer_name = insurer;
        break;
      }
    }
    
    // Policy number extraction (various formats)
    const policyNumberPatterns = [
      /policy\s+(?:no|number|#)[\s:.]*([a-z0-9][\w\d\s\/-]{5,})/i,
      /(?:policy|certificate)\s+(?:no|number|#|id)[\s:.]*([a-z0-9][\w\d\s\/-]{5,})/i
    ];
    
    for (const pattern of policyNumberPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // Clean up the policy number
        data.policy_number = match[1].replace(/\s+/g, '');
        break;
      }
    }
    
    // Policy type extraction
    const policyTypes = [
      'term life', 'term', 'whole life', 'endowment', 'money back', 'ulip',
      'pension', 'child plan', 'health', 'mediclaim', 'critical illness',
      'motor', 'car', 'two wheeler', 'home', 'travel', 'personal accident'
    ];
    
    for (const type of policyTypes) {
      const regex = new RegExp(`(${type})\\s+(?:policy|plan|insurance)`, 'i');
      const altRegex = new RegExp(`(?:policy|plan|insurance)\\s+type\\s*[:.]?\\s*(${type})`, 'i');
      
      const match = text.match(regex) || text.match(altRegex);
      if (match && match[1]) {
        data.policy_type = match[1].toLowerCase();
        break;
      }
    }
    
    // Insured name extraction
    const insuredNamePatterns = [
      /(?:insured|policy\s+holder|assured)(?:'s)?\s+name\s*[:.]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
      /name\s+of\s+(?:insured|policy\s+holder|assured)\s*[:.]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i
    ];
    
    for (const pattern of insuredNamePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.insured_name = match[1];
        break;
      }
    }
    
    // Sum assured extraction
    const sumAssuredPatterns = [
      /sum\s+(?:assured|insured)\s*[:.]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i,
      /(?:coverage|cover)\s+amount\s*[:.]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i
    ];
    
    for (const pattern of sumAssuredPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.sum_assured = match[1].replace(/,/g, '');
        break;
      }
    }
    
    // Premium amount extraction
    const premiumPatterns = [
      /premium\s+(?:amount)?\s*[:.]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i,
      /(?:annual|monthly|quarterly|half-yearly)\s+premium\s*[:.]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i
    ];
    
    for (const pattern of premiumPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.premium_amount = match[1].replace(/,/g, '');
        break;
      }
    }
    
    // Premium frequency extraction
    const frequencyPatterns = [
      /premium\s+(?:payment)?\s+(?:frequency|mode|term)\s*[:.]?\s*(\w+)/i,
      /(annual|monthly|quarterly|half-yearly|yearly)\s+(?:premium|payment)/i
    ];
    
    for (const pattern of frequencyPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.premium_frequency = match[1].toLowerCase();
        break;
      }
    }
    
    // Policy period/dates extraction
    const datePatterns = [
      /(?:policy|insurance)\s+(?:start|commencement)\s+date\s*[:.]?\s*((?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})|(?:\w+\s+\d{1,2},?\s*\d{4}))/i,
      /(?:policy|insurance)\s+(?:end|expiry|maturity)\s+date\s*[:.]?\s*((?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})|(?:\w+\s+\d{1,2},?\s*\d{4}))/i
    ];
    
    const startMatch = text.match(datePatterns[0]);
    if (startMatch && startMatch[1]) {
      data.start_date = startMatch[1];
    }
    
    const endMatch = text.match(datePatterns[1]);
    if (endMatch && endMatch[1]) {
      data.end_date = endMatch[1];
    }
    
    // Check if we extracted enough meaningful data
    const extractedFields = Object.values(data).filter(Boolean).length;
    const success = extractedFields >= 2; // At least insurer name and policy number
    
    return {
      success,
      data,
      confidence: Math.min(100, extractedFields * 10) // Simple confidence score based on fields extracted
    };
  }
  
  // Extract data from vehicle insurance policies
 export function extractVehicleInsuranceData(text) {
    if (!text || typeof text !== 'string') {
      return { success: false, error: 'No text content provided' };
    }
    
    const data = {
      insurer_name: null,
      policy_number: null,
      vehicle_number: null,
      vehicle_make: null,
      vehicle_model: null,
      chassis_number: null,
      engine_number: null,
      coverage_type: null,
      insured_amount: null,
      premium_amount: null,
      policy_period: null,
      owner_name: null
    };
    
    // Insurance company names (same as in insurance extraction)
    const insurerNames = [
      'HDFC ERGO', 'Bajaj Allianz', 'ICICI Lombard', 'New India Assurance',
      'United India Insurance', 'Oriental Insurance', 'National Insurance',
      'Reliance General', 'Tata AIG', 'Royal Sundaram', 'Liberty General',
      'SBI General', 'Go Digit', 'Future Generali', 'Universal Sompo',
      'Kotak General', 'Magma HDI', 'Acko', 'Edelweiss General'
    ];
    
    // Try to find insurer name in text
    for (const insurer of insurerNames) {
      const regex = new RegExp(insurer.replace(/\s+/g, '\\s+'), 'i');
      if (regex.test(text)) {
        data.insurer_name = insurer;
        break;
      }
    }
    
    // Policy number extraction (same as in insurance extraction)
    const policyNumberPatterns = [
      /policy\s+(?:no|number|#)[\s:.]*([a-z0-9][\w\d\s\/-]{5,})/i,
      /(?:policy|certificate)\s+(?:no|number|#|id)[\s:.]*([a-z0-9][\w\d\s\/-]{5,})/i
    ];
    
    for (const pattern of policyNumberPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.policy_number = match[1].replace(/\s+/g, '');
        break;
      }
    }
    
    // Vehicle registration number extraction
    // Indian vehicle number format: XX 00 XX 0000 (state code, district code, random letters, random numbers)
    const vehicleNumberPatterns = [
      /(?:registration|reg|vehicle)\s+(?:no|number|#)[\s:.]*([A-Z]{2}\s*\d{1,2}\s*[A-Z]{1,3}\s*\d{1,4})/i,
      /(?:registration|reg|vehicle)\s+(?:mark|id)[\s:.]*([A-Z]{2}\s*\d{1,2}\s*[A-Z]{1,3}\s*\d{1,4})/i
    ];
    
    for (const pattern of vehicleNumberPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.vehicle_number = match[1].replace(/\s+/g, '');
        break;
      }
    }
    
    // Vehicle make and model extraction
    const makeModelPatterns = [
      /(?:vehicle|car)\s+(?:make|manufacturer)[\s:.]*([A-Za-z]+)/i,
      /(?:vehicle|car)\s+model[\s:.]*([A-Za-z0-9\s]+)/i,
      /make\s*[\/&:]?\s*model[\s:.]*([A-Za-z]+[\s\/&-][A-Za-z0-9\s]+)/i
    ];
    
    const makeMatch = text.match(makeModelPatterns[0]);
    if (makeMatch && makeMatch[1]) {
      data.vehicle_make = makeMatch[1].trim();
    }
    
    const modelMatch = text.match(makeModelPatterns[1]);
    if (modelMatch && modelMatch[1]) {
      data.vehicle_model = modelMatch[1].trim();
    }
    
    // If make/model combined, try to split them
    if (!data.vehicle_make || !data.vehicle_model) {
      const combinedMatch = text.match(makeModelPatterns[2]);
      if (combinedMatch && combinedMatch[1]) {
        const parts = combinedMatch[1].split(/[\s\/&-]/);
        if (parts.length >= 2) {
          if (!data.vehicle_make) data.vehicle_make = parts[0].trim();
          if (!data.vehicle_model) data.vehicle_model = parts.slice(1).join(' ').trim();
        }
      }
    }
    
    // Chassis number extraction
    const chassisMatch = text.match(/chassis\s+(?:no|number)[\s:.]*([A-Z0-9]{5,17})/i);
    if (chassisMatch && chassisMatch[1]) {
      data.chassis_number = chassisMatch[1];
    }
    
    // Engine number extraction
    const engineMatch = text.match(/engine\s+(?:no|number)[\s:.]*([A-Z0-9]{5,17})/i);
    if (engineMatch && engineMatch[1]) {
      data.engine_number = engineMatch[1];
    }
    
    // Coverage type extraction
    const coveragePatterns = [
      /(comprehensive|third[\s-]party|third[\s-]party[\s-]only|tp[\s-]only)/i,
      /policy\s+type[\s:.]*([A-Za-z\s-]+)/i
    ];
    
    for (const pattern of coveragePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.coverage_type = match[1].toLowerCase().trim();
        break;
      }
    }
    
    // Insured amount (IDV) extraction
    const idvPatterns = [
      /(?:idv|insured\s+declared\s+value)[\s:.]*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i,
      /(?:sum\s+insured|insured\s+value)[\s:.]*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i
    ];
    
    for (const pattern of idvPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.insured_amount = match[1].replace(/,/g, '');
        break;
      }
    }
    
    // Premium amount extraction
    const premiumPatterns = [
      /(?:net|total)\s+premium[\s:.]*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i,
      /premium\s+(?:amount)?[\s:.]*(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/i
    ];
    
    for (const pattern of premiumPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.premium_amount = match[1].replace(/,/g, '');
        break;
      }
    }
    
    // Policy period extraction
    const periodPatterns = [
      /policy\s+period[\s:.]*from\s+((?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})|(?:\w+\s+\d{1,2},?\s*\d{4}))\s*to\s*((?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})|(?:\w+\s+\d{1,2},?\s*\d{4}))/i,
      /valid\s+from\s+((?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})|(?:\w+\s+\d{1,2},?\s*\d{4}))\s*(?:to|till|until)\s*((?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})|(?:\w+\s+\d{1,2},?\s*\d{4}))/i
    ];
    
    for (const pattern of periodPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[2]) {
        data.policy_period = `${match[1]} to ${match[2]}`;
        break;
      }
    }
    
    // Owner name extraction
    const ownerPatterns = [
      /(?:owner|insured|policy\s+holder)(?:'s)?\s+name[\s:.]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
      /name\s+of\s+(?:owner|insured|policy\s+holder)[\s:.]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i
    ];
    
    for (const pattern of ownerPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.owner_name = match[1];
        break;
      }
    }
    
    // Check if we extracted enough meaningful data
    const extractedFields = Object.values(data).filter(Boolean).length;
    const success = extractedFields >= 3; // More fields required due to complexity
    
    return {
      success,
      data,
      confidence: Math.min(100, extractedFields * 8) // Simple confidence score based on fields extracted
    };
  }
  
  // Main extraction function that routes to the appropriate extractor based on document type
 export function extractDataFromDocument(text, documentType) {
    if (!text || typeof text !== 'string') {
      return { success: false, error: 'No text content provided' };
    }
    
    switch (documentType) {
      case 'bank_statement':
        return extractBankStatementData(text);
        
      case 'insurance_policy':
        return extractInsuranceData(text);
        
      case 'vehicle_policy':
        return extractVehicleInsuranceData(text);
        
      default:
        // If document type is unknown, try all extractors and use the one with highest confidence
        const bankResult = extractBankStatementData(text);
        const insuranceResult = extractInsuranceData(text);
        const vehicleResult = extractVehicleInsuranceData(text);
        
        const results = [
          { type: 'bank_statement', ...bankResult },
          { type: 'insurance_policy', ...insuranceResult },
          { type: 'vehicle_policy', ...vehicleResult }
        ];
        
        // Sort by confidence and success
        results.sort((a, b) => {
          if (a.success && !b.success) return -1;
          if (!a.success && b.success) return 1;
          return b.confidence - a.confidence;
        });
        
        // Return the most confident result
        return { ...results[0], allResults: results };
    }
  }
  
  // Function to compare extracted data with static list
  export function findMissingItems(extractedData, documentType) {
    // Get the static lists
    const bankAccounts = staticData.bank_accounts || [];
    const insurances = staticData.insurances || [];
    
    // Convert both lists to lowercase for case-insensitive comparison
    const lowercaseBankAccounts = bankAccounts.map(account => account.toLowerCase());
    const lowercaseInsurances = insurances.map(insurance => insurance.toLowerCase());
    
    // Initialize results
    const result = {
      is_missing: false,
      missing_item: null,
      item_details: null
    };
    
    // Check based on document type
    if (documentType === 'bank_statement' && extractedData.bank_name) {
      // Create a bank identifier from the extracted data
      let bankIdentifier = extractedData.bank_name;
      if (extractedData.account_type) {
        bankIdentifier += ` ${extractedData.account_type}`;
      }
      bankIdentifier = bankIdentifier.toLowerCase();
      
      // Check if this bank account is in the static list
      const found = lowercaseBankAccounts.some(account => 
        bankIdentifier.includes(account) || account.includes(bankIdentifier)
      );
      
      if (!found) {
        result.is_missing = true;
        result.missing_item = bankIdentifier;
        result.item_details = extractedData;
      }
    } 
    else if ((documentType === 'insurance_policy' || documentType === 'vehicle_policy') && extractedData.insurer_name) {
      // Create an insurance identifier from the extracted data
      let insuranceIdentifier = extractedData.insurer_name;
      if (extractedData.policy_type) {
        insuranceIdentifier += ` ${extractedData.policy_type}`;
      }
      insuranceIdentifier = insuranceIdentifier.toLowerCase();
      
      // Check if this insurance is in the static list
      const found = lowercaseInsurances.some(insurance => 
        insuranceIdentifier.includes(insurance) || insurance.includes(insuranceIdentifier)
      );
      
      if (!found) {
        result.is_missing = true;
        result.missing_item = insuranceIdentifier;
        result.item_details = extractedData;
      }
    }
    
    return result;
  }