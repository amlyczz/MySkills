# Lance: Text-to-Image generation
bash inference_lance.sh \
  --TASK_NAME t2i \
  --MODEL_PATH downloads/Lance_3B \
  --RESOLUTION image_768res \
  --VIDEO_HEIGHT 768 \
  --VIDEO_WIDTH 768 \
  --SAVE_PATH_GEN results/t2i
