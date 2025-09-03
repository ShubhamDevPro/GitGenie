import os

def read_dir_tree(directory_path: str) -> str:
    """Generate a simple directory tree structure"""
    tree_lines = []
    
    try:
        for root, dirs, files in os.walk(directory_path):
            # Calculate relative depth for indentation
            level = root.replace(directory_path, '').count(os.sep)
            indent = '  ' * level
            tree_lines.append(f"{indent}{os.path.basename(root)}/")
            
            # Add files
            subindent = '  ' * (level + 1)
            for file in files:
                if not file.startswith('.'):  # Skip hidden files
                    tree_lines.append(f"{subindent}{file}")
                    
            # Limit output to avoid overwhelming context
            if len(tree_lines) > 100:
                tree_lines.append("... (truncated)")
                break
                
    except Exception as e:
        return f"Error reading directory: {str(e)}"
    
    return '\n'.join(tree_lines)

def read_file(project_root: str, relative_path: str) -> str:
    """Read a file's content"""
    try:
        full_path = os.path.join(project_root, relative_path)
        with open(full_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"Error reading file {relative_path}: {str(e)}"
