import os
import tempfile
import subprocess
from pathlib import Path
import difflib
from agents import function_tool
import sys
import shutil
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import socket_service

def patch_generator_raw(
    source_path: str,
    original_source: str,
    lint_summary: str,
    instructions: str | None = None
) -> str:
    socket_service.emit_log(f"🛠️ Generating patch for: {source_path}", 'info')
    socket_service.emit_progress("Patch Generation", 0, 3, "Analyzing source code")
    
    # For now, return a simple template that the agent can replace with actual changes
    # This will be used by a smarter apply_patch function
    new_source = original_source
    
    if instructions:
        socket_service.emit_log(f"📝 Processing instructions: {instructions[:100]}...", 'info')
        # Return the original source so the agent knows what to modify
        return original_source

    socket_service.emit_progress("Patch Generation", 1, 3, "Analyzing lint issues")
    
    # Parse lint issues and suggest improvements
    if "style" in lint_summary.lower() or "css" in lint_summary.lower():
        socket_service.emit_log("🎨 Detected styling improvement opportunities", 'info')
    
    socket_service.emit_progress("Patch Generation", 2, 3, "Preparing patch template")
    socket_service.emit_progress("Patch Generation", 3, 3, "Patch template ready")
    socket_service.emit_log(f"✅ Patch template generated for {source_path}", 'success')
    
    return original_source

def apply_patch_raw(project_root: str, filename: str, new_content: str) -> str:
    """
    Apply changes by directly writing the new content to the file.
    This replaces the problematic patch command approach.
    """
    socket_service.emit_file_operation("patch", filename, "started")
    socket_service.emit_log(f"🔧 Applying changes to: {filename}", 'info')
    print(f"🔧 DEBUGGING: apply_patch_raw called")
    print(f"📁 Project root: {project_root}")
    print(f"📄 Filename: {filename}")
    print(f"📏 New content length: {len(new_content)} chars")
    print(f"📝 New content preview: {new_content[:200]}...")
    
    socket_service.emit_progress("File Update", 0, 3, "Preparing file paths")
    
    # Handle both absolute and relative paths
    if os.path.isabs(filename):
        file_path = Path(filename)
        print(f"🔍 Using absolute path: {file_path}")
    else:
        file_path = Path(project_root) / filename
        print(f"🔍 Using relative path: {file_path}")
    
    print(f"📍 Final file path: {file_path}")
    print(f"📂 File path exists: {file_path.exists()}")
    print(f"📂 File path is file: {file_path.is_file()}")
    print(f"📂 File path is dir: {file_path.is_dir()}")
    print(f"📂 Parent directory exists: {file_path.parent.exists()}")
    print(f"📂 Parent directory path: {file_path.parent}")
    
    socket_service.emit_progress("File Update", 1, 3, f"Target file: {file_path}")
    
    try:
        # Check if file exists
        if not file_path.exists():
            print(f"❌ File not found: {file_path}")
            socket_service.emit_log(f"⚠️ File not found: {file_path}", 'warning')
            return f"Error: File not found: {file_path}"
        
        # Check current file content
        current_content = file_path.read_text(encoding='utf-8')
        print(f"📖 Current file size: {len(current_content)} chars")
        print(f"📖 Current content preview: {current_content[:200]}...")
        
        # Check if content is actually different
        if current_content == new_content:
            print(f"ℹ️ File content is identical - no changes needed")
            socket_service.emit_log(f"ℹ️ File content unchanged: {filename}", 'info')
            return f"File {filename} already has the requested content"
        
        print(f"✏️ File content differs - proceeding with update")
        socket_service.emit_progress("File Update", 2, 3, "Writing new content")
        
        # Get modification time before change
        old_mtime = file_path.stat().st_mtime
        print(f"⏰ File modification time before: {old_mtime}")
        
        # Write new content directly without backup
        print(f"💾 Writing {len(new_content)} characters to file...")
        file_path.write_text(new_content, encoding='utf-8')
        print(f"✅ File write operation completed")
        
        # Check modification time after change
        new_mtime = file_path.stat().st_mtime
        print(f"⏰ File modification time after: {new_mtime}")
        print(f"⏰ Modification time changed: {old_mtime != new_mtime}")
        
        # Verify the write was successful
        verification_content = file_path.read_text(encoding='utf-8')
        print(f"🔍 Verification read size: {len(verification_content)} chars")
        print(f"✅ Content verification matches: {verification_content == new_content}")
        
        if verification_content != new_content:
            print(f"❌ ERROR: Written content doesn't match expected content!")
            print(f"Expected: {new_content[:100]}...")
            print(f"Actual: {verification_content[:100]}...")
            return f"Error: File write verification failed for {filename}"
        
        socket_service.emit_progress("File Update", 3, 3, "File update complete")
        socket_service.emit_file_operation("patch", filename, "completed")
        socket_service.emit_log(f"✅ Successfully updated {filename}", 'success')
        
        print(f"🎉 Successfully updated {filename}")
        return f"Successfully updated {filename}"
        
    except Exception as e:
        print(f"💥 Exception during file update: {str(e)}")
        print(f"💥 Exception type: {type(e).__name__}")
        import traceback
        print(f"💥 Traceback: {traceback.format_exc()}")
        socket_service.emit_file_operation("patch", filename, "failed")
        socket_service.emit_log(f"❌ Failed to update {filename}: {str(e)}", 'error')
        return f"Error updating file: {str(e)}"

def apply_direct_edit_raw(project_root: str, filename: str, new_content: str) -> str:
    """
    Directly edit a file with new content. This is the main file editing function.
    """
    return apply_patch_raw(project_root, filename, new_content)

def create_new_file_raw(project_root: str, path: str, content: str) -> str:
    socket_service.emit_file_operation("create", path, "started")
    socket_service.emit_log(f"📝 Creating new file: {path}", 'info')
    print(f"📝 DEBUGGING: create_new_file_raw called")
    print(f"📁 Project root: {project_root}")
    print(f"📄 Path: {path}")
    print(f"📏 Content length: {len(content)} chars")
    print(f"📝 Content preview: {content[:200]}...")
    
    socket_service.emit_progress("File Creation", 0, 3, f"Preparing to create: {path}")
    
    try:
        # Handle both absolute and relative paths
        if os.path.isabs(path):
            full_path = Path(path)
            print(f"🔍 Using absolute path: {full_path}")
        else:
            full_path = Path(project_root) / path
            print(f"🔍 Using relative path: {full_path}")
        
        print(f"📍 Final file path: {full_path}")
        print(f"📂 File already exists: {full_path.exists()}")
        print(f"📂 Parent directory: {full_path.parent}")
        print(f"📂 Parent directory exists: {full_path.parent.exists()}")
        
        socket_service.emit_progress("File Creation", 1, 3, "Creating directory structure")
        print(f"🏗️ Creating parent directories...")
        full_path.parent.mkdir(parents=True, exist_ok=True)
        print(f"✅ Parent directories created/verified")
        
        socket_service.emit_progress("File Creation", 2, 3, f"Writing content ({len(content)} characters)")
        print(f"💾 Writing {len(content)} characters to new file...")
        full_path.write_text(content, encoding="utf-8")
        print(f"✅ File write operation completed")
        
        # Verify the file was created successfully
        if full_path.exists():
            verification_content = full_path.read_text(encoding='utf-8')
            print(f"🔍 Verification: file exists and has {len(verification_content)} chars")
            print(f"✅ Content verification matches: {verification_content == content}")
            if verification_content != content:
                print(f"❌ ERROR: Written content doesn't match expected content!")
                return f"Error: File creation verification failed for {path}"
        else:
            print(f"❌ ERROR: File was not created!")
            return f"Error: File was not created at {path}"
        
        socket_service.emit_progress("File Creation", 3, 3, "File creation complete")
        socket_service.emit_file_operation("create", path, "completed")
        socket_service.emit_log(f"✅ Successfully created file: {path}", 'success')
        
        print(f"🎉 Successfully created file: {path}")
        return f"Created new file: {path}"
        
    except Exception as e:
        print(f"💥 Exception during file creation: {str(e)}")
        print(f"💥 Exception type: {type(e).__name__}")
        import traceback
        print(f"💥 Traceback: {traceback.format_exc()}")
        socket_service.emit_file_operation("create", path, "failed")
        socket_service.emit_log(f"❌ Failed to create file {path}: {str(e)}", 'error')
        return f"Error creating file: {str(e)}"

@function_tool
def patch_generator(source_path: str, original_source: str, lint_summary: str, instructions: str | None = None) -> str:
    """Generate a patch template for the given source file."""
    return patch_generator_raw(source_path, original_source, lint_summary, instructions)

@function_tool
def apply_patch(project_root: str, filename: str, new_content: str) -> str:
    """Apply changes to a file by writing new content directly. This replaces the old patch-based approach."""
    return apply_patch_raw(project_root, filename, new_content)

@function_tool
def create_new_file(project_root: str, path: str, content: str) -> str:
    """Create a new file with the specified content."""
    return create_new_file_raw(project_root, path, content)

@function_tool
def edit_file(project_root: str, filename: str, new_content: str) -> str:
    """Directly edit a file with new content. This is the main file editing function."""
    return apply_direct_edit_raw(project_root, filename, new_content)

@function_tool
def update_file_content(project_root: str, filename: str, new_content: str) -> str:
    """Update an existing file with new content. Overwrites the file directly."""
    return apply_patch_raw(project_root, filename, new_content)
