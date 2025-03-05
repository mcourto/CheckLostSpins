// Whale.io Lootbox Checker Script - Find all WITHDRAWN items
// Paste this in Chrome DevTools console while on whale.io

// Configuration
const MAX_PAGES = 20; // Maximum number of pages to check
const PAGE_SIZE = 50; // Items per page
const DEBUG = false; // Set to true for additional debug information

// Storage for results
const withdrawnItems = [];
let totalValueUsd = 0;
const currencyTotals = {};

// Format date for better readability
function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Function to get current auth token from localStorage
function getAuthToken() {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('Auth token not found in localStorage.');
    }
    
    if (DEBUG) {
      console.debug("Found auth token:", token.substring(0, 10) + '...');
    }
    
    return token;
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
}

// Function to fetch a specific page
async function fetchPage(page) {
  console.log(`Fetching page ${page}...`);
  
  try {
    // Get the current auth token
    const authToken = getAuthToken();
    
    if (!authToken) {
      throw new Error('Cannot fetch data without auth token. Please ensure you are logged in to whale.io');
    }
    
    const response = await fetch(`https://api-ms.crashgame247.io/lootbox/unboxing-history?page=${page}&pageSize=${PAGE_SIZE}`, {
      "headers": {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "authorization": `Bearer ${authToken}`,
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "x-device": "WEB",
        "x-lang": "en",
        "x-platform": "unknown"
      },
      "referrer": "https://whale.io/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": null,
      "method": "GET",
      "mode": "cors",
      "credentials": "include"
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      items: data.data,
      pageCount: data.meta.pagination.pageCount,
      total: data.meta.pagination.total
    };
  } catch (error) {
    console.error(`Error fetching page ${page}:`, error);
    return { items: [], pageCount: 0, total: 0 };
  }
}

// Process items and collect those with WITHDRAWN status
function processItems(items) {
  const withdrawnFromPage = items.filter(item => item.status === "WITHDRAWN");
  
  withdrawnFromPage.forEach(item => {
    // Extract needed information
    const itemInfo = {
      id: item.id,
      name: item.item.name,
      gameCode: item.productDetails.game_code || 'N/A',
      product: item.productDetails.product || 'N/A',
      valueUsd: item.costInUsd,
      valueCurrency: item.costInCurrency,
      currency: item.currency,
      rarity: item.item.rarity,
      createdAt: item.createdAt,
      formattedDateTime: formatDateTime(item.createdAt),
      lootboxName: item.lootbox.name
    };
    
    withdrawnItems.push(itemInfo);
    
    // Update totals
    totalValueUsd += item.costInUsd;
    if (!currencyTotals[item.currency]) {
      currencyTotals[item.currency] = 0;
    }
    currencyTotals[item.currency] += item.costInCurrency;
  });
  
  return withdrawnFromPage.length;
}

// Main function to run the check
async function checkAllLootboxes() {
  console.log("🔍 Starting Whale.io Lootbox Checker...");
  
  // Check if we're on the right site
  if (!window.location.hostname.includes('whale.io')) {
    console.warn("⚠️ You don't appear to be on whale.io. This script is designed to work on whale.io site.");
    console.warn("If you are on whale.io but seeing this message, you can continue, but results may not be accurate.");
  }
  
  // Check if we have an auth token
  const authToken = getAuthToken();
  if (!authToken) {
    console.error("❌ Authentication token not found. Please make sure you are logged in to whale.io");
    return { items: [], totalValueUsd: 0, currencyTotals: {} };
  }
  
  console.log(`Will check up to ${MAX_PAGES} pages with ${PAGE_SIZE} items per page`);
  
  let currentPage = 1;
  let totalPages = MAX_PAGES; // Default limit
  let done = false;
  
  // First page to get total number of pages
  const firstPageData = await fetchPage(1);
  if (firstPageData.pageCount > 0) {
    totalPages = Math.min(firstPageData.pageCount, MAX_PAGES);
    processItems(firstPageData.items);
  }
  
  // Process remaining pages
  for (currentPage = 2; currentPage <= totalPages && !done; currentPage++) {
    const pageData = await fetchPage(currentPage);
    if (pageData.items.length === 0) {
      done = true;
    } else {
      const foundCount = processItems(pageData.items);
      console.log(`Found ${foundCount} WITHDRAWN items on page ${currentPage}`);
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Sort results by date
  withdrawnItems.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  // Display results
  console.log("\n===== RESULTS =====");
  console.log(`Found ${withdrawnItems.length} items with WITHDRAWN status:\n`);
  
  withdrawnItems.forEach((item, index) => {
    console.log(`${index + 1}. ID: ${item.id} - ${item.formattedDateTime}`);
    console.log(`   Name: ${item.name}`);
    console.log(`   Game: ${item.gameCode} (${item.product})`);
    console.log(`   Value: $${item.valueUsd.toFixed(2)} (${item.valueCurrency.toFixed(5)} ${item.currency})`);
    console.log(`   Rarity: ${item.rarity}`);
    console.log(`   From: ${item.lootboxName}`);
    console.log(`   --------------------------------------------------`);
  });
  
  console.log("\n===== SUMMARY =====");
  console.log(`Total items: ${withdrawnItems.length}`);
  console.log(`Total value in USD: $${totalValueUsd.toFixed(2)}`);
  
  Object.entries(currencyTotals).forEach(([currency, amount]) => {
    console.log(`Total value in ${currency}: ${amount.toFixed(5)}`);
  });
  
  // Return the collected data for further use if needed
  return {
    items: withdrawnItems,
    totalValueUsd,
    currencyTotals
  };
}

// Run the checker
checkAllLootboxes()
  .then(results => {
    console.log("✅ Check completed successfully!");
    // The full results are also returned as an object if you want to use them
  })
  .catch(error => {
    console.error("❌ Error during check:", error);
  });
