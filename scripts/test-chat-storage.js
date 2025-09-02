/**
 * Test script to verify chat storage functionality
 * Run this in the browser console to test localStorage operations
 */

// Test the chat storage functionality
function testChatStorage() {
  console.log('🧪 Testing Chat Storage...');
  
  // Test data
  const testMessage = {
    id: 'test-1',
    text: 'This is a test message from the user',
    sender: 'user',
    timestamp: new Date()
  };
  
  const testBotMessage = {
    id: 'test-2', 
    text: 'This is a test response from the AI assistant',
    sender: 'bot',
    timestamp: new Date()
  };
  
  const testSession = {
    repositoryId: 'test-repo-123',
    repositoryName: 'Test Repository',
    messages: [testMessage, testBotMessage],
    lastUpdated: new Date()
  };
  
  // Test 1: Save to localStorage
  try {
    const storageKey = 'gitgenie_chat_sessions';
    const existingSessions = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const sessions = [testSession, ...existingSessions.filter(s => s.repositoryId !== testSession.repositoryId)];
    localStorage.setItem(storageKey, JSON.stringify(sessions));
    console.log('✅ Test 1 passed: Successfully saved session to localStorage');
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }
  
  // Test 2: Read from localStorage
  try {
    const storageKey = 'gitgenie_chat_sessions';
    const sessions = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const foundSession = sessions.find(s => s.repositoryId === testSession.repositoryId);
    
    if (foundSession && foundSession.messages.length === 2) {
      console.log('✅ Test 2 passed: Successfully retrieved session from localStorage');
    } else {
      console.error('❌ Test 2 failed: Session not found or incomplete');
    }
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }
  
  // Test 3: Storage size check
  try {
    const storageKey = 'gitgenie_chat_sessions';
    const stored = localStorage.getItem(storageKey);
    const sizeKB = stored ? Math.round(stored.length / 1024) : 0;
    console.log(`📊 Storage size: ${sizeKB} KB`);
    console.log('✅ Test 3 passed: Storage size calculated successfully');
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }
  
  // Test 4: Clean up test data
  try {
    const storageKey = 'gitgenie_chat_sessions';
    const sessions = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const filteredSessions = sessions.filter(s => s.repositoryId !== testSession.repositoryId);
    localStorage.setItem(storageKey, JSON.stringify(filteredSessions));
    console.log('✅ Test 4 passed: Test data cleaned up successfully');
  } catch (error) {
    console.error('❌ Test 4 failed:', error);
  }
  
  console.log('🎉 Chat storage tests completed!');
}

// Instructions for manual testing
console.log(`
🧪 GitGenie Chat Storage Test

To test the chat storage functionality:

1. Run testChatStorage() in this console
2. Navigate to a project in the app
3. Send a few test messages to the AI
4. Refresh the page to see if messages persist
5. Check the chat history modal
6. Try clearing the chat session
7. Test storage info display

Run the test now:
testChatStorage();
`);

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testChatStorage };
}
