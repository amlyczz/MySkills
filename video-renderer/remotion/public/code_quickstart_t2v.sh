# Lance: Text-to-Video generation
bash inference_lance.sh \
  --TASK_NAME t2v \
  --MODEL_PATH downloads/Lance_3B_Video \
  --RESOLUTION video_480p \
  --NUM_FRAMES 121 \
  --VIDEO_HEIGHT 480 \
  --VIDEO_WIDTH 848 \
  --SAVE_PATH_GEN results/t2v
