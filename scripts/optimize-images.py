#!/usr/bin/env python3
"""Optimize intro-bg.png image for faster loading"""

import os
from PIL import Image

# Define paths
public_dir = '/vercel/share/v0-project/public'
images_dir = os.path.join(public_dir, 'images')
intro_bg_path = os.path.join(images_dir, 'intro-bg.png')
intro_bg_webp = os.path.join(images_dir, 'intro-bg.webp')

if not os.path.exists(intro_bg_path):
    print(f"[v0] Error: {intro_bg_path} not found")
    exit(1)

# Get original file size
original_size = os.path.getsize(intro_bg_path)
print(f"[v0] Original intro-bg.png size: {original_size / 1024:.2f} KB")

try:
    # Open and optimize PNG
    img = Image.open(intro_bg_path)
    print(f"[v0] Image size: {img.size}, Mode: {img.mode}")
    
    # Resize if too large (max width 1920 for desktop)
    if img.width > 1920:
        ratio = 1920 / img.width
        new_size = (1920, int(img.height * ratio))
        img = img.resize(new_size, Image.Resampling.LANCZOS)
        print(f"[v0] Resized to: {img.size}")
    
    # Save optimized PNG
    img.save(intro_bg_path, 'PNG', optimize=True, quality=85)
    optimized_png_size = os.path.getsize(intro_bg_path)
    print(f"[v0] Optimized PNG size: {optimized_png_size / 1024:.2f} KB (reduction: {(1 - optimized_png_size / original_size) * 100:.1f}%)")
    
    # Save as WebP for better compression
    img.save(intro_bg_webp, 'WEBP', quality=85)
    webp_size = os.path.getsize(intro_bg_webp)
    print(f"[v0] WebP version created: {webp_size / 1024:.2f} KB (reduction: {(1 - webp_size / original_size) * 100:.1f}%)")
    
    print("[v0] Image optimization complete!")
    print("[v0] Update start-screen.tsx to use WebP: backgroundImage: 'url(/images/intro-bg.webp)'")
    
except Exception as e:
    print(f"[v0] Error optimizing image: {e}")
    exit(1)
