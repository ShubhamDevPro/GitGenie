/**
 * Utility to test WebSocket connection to the VM agent
 */

export async function testAgentConnection(vmIP: string): Promise<{
  success: boolean;
  message: string;
  latency?: number;
}> {
  const startTime = Date.now();
  
  try {
    // Test HTTP endpoint first
    const response = await fetch(`http://${vmIP}:5000/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      return {
        success: true,
        message: `Agent server is reachable (${latency}ms)`,
        latency,
      };
    } else {
      return {
        success: false,
        message: `Agent server returned ${response.status}: ${response.statusText}`,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    
    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        return {
          success: false,
          message: `Connection timeout after ${latency}ms - Agent may be offline`,
        };
      }
      
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
      };
    }
    
    return {
      success: false,
      message: 'Unknown connection error',
    };
  }
}

export function getSocketStatus(isConnected: boolean, vmIP: string): {
  status: 'connected' | 'disconnected' | 'error';
  message: string;
  color: string;
} {
  if (!vmIP) {
    return {
      status: 'error',
      message: 'No VM IP configured',
      color: 'text-red-500',
    };
  }
  
  if (isConnected) {
    return {
      status: 'connected',
      message: `Connected to ${vmIP}:5000`,
      color: 'text-green-500',
    };
  }
  
  return {
    status: 'disconnected',
    message: `Disconnected from ${vmIP}:5000`,
    color: 'text-red-500',
  };
}
