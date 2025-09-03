import os
from pathlib import Path
import socket_service

def apply_patch_raw(project_root: str, filename: str, new_content: str) -> str:
    """
    Apply changes by directly writing the new content to the file.
    Enhanced with debugging to track exactly what's happening.
    """
    socket_service.emit_log(f"🔧 Applying changes to: {filename}", 'info')
    print(f"🔧 DEBUGGING: apply_patch_raw called")
    print(f"📁 Project root: {project_root}")
    print(f"📄 Filename: {filename}")
    print(f"📏 New content length: {len(new_content)} chars")
    print(f"📝 New content preview: {new_content[:200]}...")
    
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
        
        # Get modification time before change
        old_mtime = file_path.stat().st_mtime
        print(f"⏰ File modification time before: {old_mtime}")
        
        # Write new content directly without backup
        print(f"💾 Writing {len(new_content)} characters to file...")
        
        # Try multiple write approaches to debug the issue
        try:
            # Method 1: Standard write_text
            file_path.write_text(new_content, encoding='utf-8')
            print(f"✅ File write operation completed")
            
            # Immediate verification attempt 1
            verification_content = file_path.read_text(encoding='utf-8')
            print(f"🔍 Immediate verification read size: {len(verification_content)} chars")
            print(f"✅ Immediate content verification matches: {verification_content == new_content}")
            
            # Wait a moment and verify again
            import time
            time.sleep(0.1)
            verification_content2 = file_path.read_text(encoding='utf-8')
            print(f"🔍 Delayed verification read size: {len(verification_content2)} chars")
            print(f"✅ Delayed content verification matches: {verification_content2 == new_content}")
            
            # Show actual vs expected if they don't match
            if verification_content != new_content:
                print(f"❌ ERROR: Written content doesn't match expected content!")
                print(f"Expected preview: {new_content[:100]}...")
                print(f"Actual preview: {verification_content[:100]}...")
                print(f"Expected full: {repr(new_content)}")
                print(f"Actual full: {repr(verification_content)}")
            
            if verification_content2 != new_content:
                print(f"❌ ERROR: Delayed verification also failed!")
                print(f"Delayed actual preview: {verification_content2[:100]}...")
        
        except Exception as write_error:
            print(f"❌ WRITE ERROR: {write_error}")
            return f"Error writing file {filename}: {write_error}"
        
        # Check modification time after change
        new_mtime = file_path.stat().st_mtime
        print(f"⏰ File modification time after: {new_mtime}")
        print(f"⏰ Modification time changed: {old_mtime != new_mtime}")
        
        # Final verification
        final_verification = file_path.read_text(encoding='utf-8')
        print(f"🔍 Final verification read size: {len(final_verification)} chars")
        print(f"✅ Final content verification matches: {final_verification == new_content}")
        
        if final_verification != new_content:
            print(f"❌ FINAL ERROR: File write verification failed!")
            print(f"Expected: {new_content[:100]}...")
            print(f"Actual: {final_verification[:100]}...")
            return f"Error: File write verification failed for {filename}"
        
        socket_service.emit_log(f"✅ Successfully updated {filename}", 'success')
        
        print(f"🎉 Successfully updated {filename}")
        return f"Successfully updated {filename}"
        
    except Exception as e:
        print(f"💥 Exception during file update: {str(e)}")
        print(f"💥 Exception type: {type(e).__name__}")
        import traceback
        print(f"💥 Traceback: {traceback.format_exc()}")
        socket_service.emit_log(f"❌ Failed to update {filename}: {str(e)}", 'error')
        return f"Error updating file: {str(e)}"

def create_new_file_raw(project_root: str, path: str, content: str) -> str:
    socket_service.emit_log(f"📝 Creating new file: {path}", 'info')
    print(f"📝 DEBUGGING: create_new_file_raw called")
    print(f"📁 Project root: {project_root}")
    print(f"📄 Path: {path}")
    print(f"📏 Content length: {len(content)} chars")
    print(f"📝 Content preview: {content[:200]}...")
    
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
        
        print(f"🏗️ Creating parent directories...")
        full_path.parent.mkdir(parents=True, exist_ok=True)
        print(f"✅ Parent directories created/verified")
        
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
        
        socket_service.emit_log(f"✅ Successfully created file: {path}", 'success')
        
        print(f"🎉 Successfully created file: {path}")
        return f"Created new file: {path}"
        
    except Exception as e:
        print(f"💥 Exception during file creation: {str(e)}")
        print(f"💥 Exception type: {type(e).__name__}")
        import traceback
        print(f"💥 Traceback: {traceback.format_exc()}")
        socket_service.emit_log(f"❌ Failed to create file {path}: {str(e)}", 'error')
        return f"Error creating file: {str(e)}"
