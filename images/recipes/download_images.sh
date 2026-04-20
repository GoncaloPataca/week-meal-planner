#!/bin/bash
# Download breakfast recipe images from Chef António Duarte's website

base_url="https://pequeno-almoco.chefantonioduarte.com/recipes"

# Recipe IDs from breakfastService.ts: 1, 2, 4, 6, 7, 11, 12, 15, 16, 20
images=(
  "panquecas-banana-aveia.jpg"
  "overnight-oats.jpg"
  "smoothie-bowl-verde.jpg"
  "panquecas-batata-doce.jpg"
  "pudim-chia-manga.jpg"
  "smoothie-abacate-cacau.jpg"
  "tapioca-ovo-espinafres.jpg"
  "papas-aveia-maca.jpg"
  "acai-bowl.jpg"
  "ovos-abacate.jpg"
)

for img in "${images[@]}"; do
  if [ ! -f "$img" ]; then
    echo "Downloading $img..."
    curl -o "$img" "$base_url/$img" 2>&1 | grep -E "(saved|100)"
  else
    echo "Skipping $img (already exists)"
  fi
done

echo "Done! Downloaded images for breakfast recipes."
