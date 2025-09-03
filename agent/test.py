from my_agent import agent

def fix():
    project_path = r"C:\Users\ASUS\PROGRAMS\Projects\test-ibm"
    session_id = 'USER-NAV'
    user_instructions = 'Make why choose us page with dummy data'

    log = agent(project_path, session_id, user_instructions)

    print(log)

fix()