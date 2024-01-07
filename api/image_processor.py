import os
from PIL import Image
import PIL.ImageOps
from pathlib import Path
import glob
import json
import logging
import cv2
import re
import swapper
import insightface
from insightface.app import FaceAnalysis
from collections import Counter
from pycivitai import civitai_download

CURRENT_PATH = os.path.dirname(os.path.abspath(__file__))

try:
    from diffusers import (
        StableDiffusionXLAdapterPipeline,
        T2IAdapter,
        EulerAncestralDiscreteScheduler,
        AutoencoderKL,
        UniPCMultistepScheduler,
        StableDiffusionControlNetImg2ImgPipeline,
        ControlNetModel,
    )
    from diffusers.utils import load_image, make_image_grid
    from controlnet_aux import ZoeDetector
    import torch
    import numpy as np
    from safetensors.torch import load
    import skimage.io
    import skimage.util
    import skimage.io
    import skimage.util
except ImportError:
    print("Error importing diffusers, it will not run on CPU")
    exit


class ImageProcessor:
    def __init__(self, config=None, logging=None):
        if config is None:
            self.logging.error("No config provided, exiting")
            exit
        if config["processor"] is None:
            self.logging.error("No processor config provided, exiting")
            exit
        if config["processor"]["models"] is None:
            self.logging.error("No processor config provided, exiting")
            exit

        self.config = config
        self.process_config = self.config["processor"]
        self.models_config = self.process_config["models"]

        self.logging = logging

        try:
            device = torch.device("cuda:%i" % self.config["processor"]["gpu_id"])

            euler_a = EulerAncestralDiscreteScheduler.from_pretrained(
                self.models_config["sdxl"],
                subfolder="scheduler"
            )

            vae = AutoencoderKL.from_pretrained(
                self.models_config["vae"],
                torch_dtype=torch.float16
            )

            adapter = T2IAdapter.from_pretrained(
                self.models_config["t2iAdapter"],
                torch_dtype=torch.float16,
                varient="fp16",
            ).to(device)

            self.pipe = StableDiffusionXLAdapterPipeline.from_pretrained(
                self.models_config["sdxl"],
                vae=vae,
                adapter=adapter,
                scheduler=euler_a,
                torch_dtype=torch.float16,
                variant="fp16",
            ).to(device)

            # if "lora_id" in self.models_config:
            #     lora_id = self.models_config["lora_id"]
            #     self.pipe.load_lora_weights(lora_id)

            ### LCM LORA pipeline
            # self.pipe = DiffusionPipeline.from_pretrained(
            #     self.models_config["sdxl"],
            #     variant="fp16"
            # )

            # self.pipe.load_lora_weights(self.models_config["lora"])
            # self.pipe.scheduler = LCMScheduler.from_config(
            #     self.pipe.scheduler.config
            # )
            # self.pipe.to(device)

            self.pipe.enable_xformers_memory_efficient_attention()

            self.zoe_depth = ZoeDetector.from_pretrained(
                self.models_config["zoe_depth"]["model_id"],
                filename=self.models_config["zoe_depth"]["filename"],
                model_type=self.models_config["zoe_depth"]["model_type"],
            ).to(device)

            # # load control net and stable diffusion v1-5
            # controlnet = ControlNetModel.from_pretrained(
            #     "monster-labs/control_v1p_sd15_qrcode_monster",
            #     torch_dtype=torch.float16
            # )

            # self.controlnet_pipe = StableDiffusionControlNetImg2ImgPipeline.from_pretrained(
            #     "runwayml/stable-diffusion-v1-5",
            #     controlnet=controlnet,
            #     torch_dtype=torch.float16
            # )

            # # speed up diffusion process with faster scheduler and memory optimization
            # self.controlnet_pipe.scheduler = UniPCMultistepScheduler.from_config(
            #     self.controlnet_pipe.scheduler.config
            # )
            # self.controlnet_pipe.enable_model_cpu_offload()

            self.face_analyser = FaceAnalysis(
                name=self.models_config["face_analysis"]
            )
            self.face_analyser.prepare(ctx_id=0)

            self.swapper = insightface.model_zoo.get_model(
                self.models_config["swapper"]
            )
        except torch.cuda.OutOfMemoryError:
            self.logging.error("Error on torch device memory, exiting")
            self.logging.error(torch.cuda.memory_summary(device=None, abbreviated=False))
            exit()

    def src_path(self, filename):
        return Path(self.config["capture_folder"], filename)

    def dst_path(self, filename, prefix = "", suffix = ""):
        filename_no_extension = filename.split(".")[0]
        dst_filename = f"%s%s%s%s%s.%s" % (
            self.process_config["output_prefix"],
            prefix,
            filename_no_extension,
            self.process_config["output_suffix"],
            suffix,
            "jpg"
        )

        return Path(self.config["capture_folder"], dst_filename)

    def face_to_prompt(self, faces):

        if len(faces) == 0:
            return ""

        prompt = []

        for face in faces:
            gender = "woman" if face['gender'] == 0 else "man"
            # prompt.append(f"%s %syo" % (gender, face["age"]))
            prompt.append(gender)

        return ", ".join(prompt)

    def face_swap(self, source, target):

        try:
            source_faces = self.face_analyser.get(cv2.imread(str(source)))
            target_faces = self.face_analyser.get(cv2.imread(str(target)))
        except ValueError:
            pass

        frame = cv2.imread(str(target))
        for source_face, target_face in zip(source_faces, target_faces):
            frame = self.swapper.get(frame, target_face, source_face, paste_back=True)
        cv2.imwrite(str(target), frame)

        return frame

    def run(self, filename, prompt="", negative_prompt="", loras=[]):

        src_path = self.src_path(filename)

        src_img = load_image(str(src_path))
        src_img = self.zoe_depth(
            src_img,
            gamma_corrected=True,
            detect_resolution=512,
            image_resolution=1024
        )

        self.pipe.unload_lora_weights()
        for lora in loras:
            lora_path = civitai_download(
                lora["civitai_id"],
                version=lora["civitai_version"]
            )
            self.pipe.load_lora_weights(lora_path)

        if "face_to_prompt" in self.process_config["extras"]:
            source_faces = self.face_analyser.get(cv2.imread(str(src_path)))
            face_prompt = self.face_to_prompt(source_faces)
            prompt = ", ".join([prompt, face_prompt])

        config_num_inference_steps = 30
        config_adapter_conditioning_scale = 1
        config_guidance_scale = 7.5
        config_lora_scale = 0.9

        if "pipe_params" in self.process_config:
            pipe_params = self.process_config["pipe_params"]
            if "num_inference_steps" in pipe_params:
                config_num_inference_steps = pipe_params["num_inference_steps"]

            if "adapter_conditioning_scale" in pipe_params:
                config_adapter_conditioning_scale = pipe_params["adapter_conditioning_scale"]

            if "guidance_scale" in pipe_params:
                config_guidance_scale = pipe_params["guidance_scale"]

            if "lora_scale" in pipe_params:
                config_lora_scale = pipe_params["lora_scale"]

        dst_path = self.dst_path(filename)

        self.logging.debug(f"Running prompt: {prompt}")

        try:
            dst_img = self.pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                image=src_img,
                num_inference_steps=config_num_inference_steps,
                adapter_conditioning_scale=config_adapter_conditioning_scale,
                guidance_scale=config_guidance_scale,
                cross_attention_kwargs={"scale": config_lora_scale},
            ).images[0]

            dst_img.save(str(dst_path))
        except (BrokenPipeError, RuntimeError):
            self.logging.error(torch.cuda.memory_summary(device=None, abbreviated=False))
            dst_img = self.pipe(
                prompt="Error on torch device memory",
                negative_prompt=negative_prompt,
                image=src_img,
                num_inference_steps=config_num_inference_steps,
                adapter_conditioning_scale=config_adapter_conditioning_scale,
                guidance_scale=config_guidance_scale,
                cross_attention_kwargs={"scale": config_lora_scale},
            ).images[0]

            dst_img.save(str(dst_path))
            exit()

        if "swap_faces" in self.process_config["extras"]:

            self.face_swap(
                source=src_path,
                target=dst_path
            )

        # if "controlnet" in self.process_config:

        #     controlnet_config = self.process_config["controlnet"]

        #     src_img = load_image(str(dst_path))
        #     control_img = load_image(controlnet_config["image"])

        #     num_inference_steps = 50
        #     if "num_inference_steps" in controlnet_config:
        #         num_inference_steps = controlnet_config["num_inference_steps"]

        #     guidance_scale = 7.5
        #     if "guidance_scale" in controlnet_config:
        #         guidance_scale = controlnet_config["guidance_scale"]

        #     generator = torch.manual_seed(0)
        #     image = self.controlnet_pipe(
        #         prompt,
        #         num_inference_steps=num_inference_steps,
        #         guidance_scale=guidance_scale,
        #         generator=generator,
        #         image=src_img,
        #         control_image=control_img,
        #     ).images[0]

        #     dst_path = self.dst_path(filename, "", "_controlnet")
        #     dst_img.save(str(dst_path))

        return dst_path
