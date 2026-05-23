# Text-to-video generation
from lance import LancePipeline
pipe = LancePipeline.from_pretrained("bytedance/Lance")
video = pipe("A panda eating bamboo", task="text-to-video")
video.save("panda.mp4")
