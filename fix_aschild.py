import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # If file doesn't have Button asChild, skip
    if '<Button asChild' not in content and '<DropdownMenuTrigger asChild' not in content and '<DropdownMenuItem asChild' not in content:
        return

    print(f"Processing {filepath}")
    
    # 1. Add imports if needed and we are replacing Button
    if '<Button asChild' in content:
        if 'buttonVariants' not in content:
            content = re.sub(r'(import \{.*?)Button(.*?)(\} from "@/components/ui/button";)', r'\1Button, buttonVariants\2\3', content)
            if 'buttonVariants' not in content: # fallback if Button is imported differently
                content = content.replace('import { Button }', 'import { Button, buttonVariants }')
        
        if 'import { cn }' not in content:
            # find first import
            content = content.replace('import', 'import { cn } from "@/lib/utils";\nimport', 1)

    # 2. Replace <Button asChild ...> <Link href="...">Text</Link> </Button>
    # Note: this regex handles multiline safely
    def replacer(match):
        attrs = match.group(1) # all attributes inside <Button asChild ...>
        link_tag = match.group(2) # <Link href="/something">
        link_content = match.group(3) # Text inside link
        
        # Parse variant, size, className from attrs
        variant_m = re.search(r'variant="([^"]+)"', attrs)
        size_m = re.search(r'size="([^"]+)"', attrs)
        class_m = re.search(r'className="([^"]+)"', attrs)
        
        variant = f'variant: "{variant_m.group(1)}"' if variant_m else ""
        size = f'size: "{size_m.group(1)}"' if size_m else ""
        opts = []
        if variant: opts.append(variant)
        if size: opts.append(size)
        opts_str = f"{{ {', '.join(opts)} }}" if opts else ""
        
        class_val = class_m.group(1) if class_m else ""
        class_arg = f', "{class_val}"' if class_val else ""
        
        # Ensure we inject the className into the Link tag
        new_link_tag = link_tag
        if 'className=' in new_link_tag:
            # Note: naive replacement for existing className in link (usually empty in our cases)
            pass
        else:
            new_link_tag = new_link_tag.replace('>', f' className={{cn(buttonVariants({opts_str}){class_arg})}}>', 1)
            
        return f"{new_link_tag}{link_content}</Link>"

    content = re.sub(r'<Button asChild([^>]*)>\s*(<Link[^>]*>)(.*?)</Link>\s*</Button>', replacer, content, flags=re.DOTALL)
    
    # 3. Handle DropdownMenuTrigger asChild
    content = content.replace('<DropdownMenuTrigger asChild>', '<DropdownMenuTrigger>')
    content = content.replace('<DropdownMenuTrigger asChild ', '<DropdownMenuTrigger ')

    # 4. Handle DropdownMenuItem asChild
    content = content.replace('<DropdownMenuItem asChild>', '<DropdownMenuItem>')
    content = content.replace('<DropdownMenuItem asChild ', '<DropdownMenuItem ')
    
    # Actually wait, DropdownMenuItem in Base UI renders a DOM element itself, we can't just wrap a Link without asChild if we want it to be a Link.
    # Base UI uses `render={<Link href="..." />}`. Let's use `render` for DropdownMenu Trigger and Item if there is a Link inside!
    # Wait, we can just replace `<DropdownMenuItem asChild><Link href="...">Text</Link></DropdownMenuItem>` with `<DropdownMenuItem render={<Link href="..." />}>Text</DropdownMenuItem>`
    def render_replacer(match):
        component = match.group(1)
        attrs = match.group(2)
        link_tag = match.group(3)
        link_content = match.group(4)
        return f'<{component} render={{{link_tag}{link_content}</Link>}}{attrs} />'
        
    content = re.sub(r'<(DropdownMenuItem|DropdownMenuTrigger)\s*asChild([^>]*)>\s*(<Link[^>]*>)(.*?)</Link>\s*</\1>', render_replacer, content, flags=re.DOTALL)
    # If the child is not a link (like <Button>), just remove asChild and let it render naturally with classes!
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, _, files in os.walk('d:/Projects/deflekt/app/src'):
    for file in files:
        if file.endswith('.tsx'):
            process_file(os.path.join(root, file))
