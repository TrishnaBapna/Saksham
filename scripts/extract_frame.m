// SAKSHAM NEURO-CARE — Native macOS Video Frame Extractor
// Uses AVFoundation, CoreMedia, CoreGraphics, and ImageIO
// Compiles with standard Apple clang without third-party dependencies

#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <CoreMedia/CoreMedia.h>
#import <CoreGraphics/CoreGraphics.h>
#import <ImageIO/ImageIO.h>

int main(int argc, char *argv[]) {
    @autoreleasepool {
        if (argc < 4) {
            printf("Usage: %s <input_video> <timestamp_seconds> <output_image>\n", argv[0]);
            return 1;
        }
        NSString *inPath = [NSString stringWithUTF8String:argv[1]];
        double timeSec = atof(argv[2]);
        NSString *outPath = [NSString stringWithUTF8String:argv[3]];

        NSURL *videoURL = [NSURL fileURLWithPath:inPath];
        AVURLAsset *asset = [[AVURLAsset alloc] initWithURL:videoURL options:nil];
        AVAssetImageGenerator *generator = [[AVAssetImageGenerator alloc] initWithAsset:asset];
        generator.appliesPreferredTrackTransform = YES;
        generator.requestedTimeToleranceBefore = kCMTimeZero;
        generator.requestedTimeToleranceAfter = kCMTimeZero;

        CMTime time = CMTimeMakeWithSeconds(timeSec, 600);
        NSError *error = nil;
        CMTime actualTime;
        #pragma clang diagnostic push
        #pragma clang diagnostic ignored "-Wdeprecated-declarations"
        CGImageRef imageRef = [generator copyCGImageAtTime:time actualTime:&actualTime error:&error];
        #pragma clang diagnostic pop

        if (!imageRef || error) {
            NSLog(@"Error generating image: %@", error);
            return 2;
        }

        NSURL *outURL = [NSURL fileURLWithPath:outPath];
        CFStringRef type = [outPath hasSuffix:@".png"] ? CFSTR("public.png") : CFSTR("public.jpeg");
        CGImageDestinationRef dest = CGImageDestinationCreateWithURL((__bridge CFURLRef)outURL, type, 1, nil);
        if (!dest) {
            NSLog(@"Error creating image destination");
            CGImageRelease(imageRef);
            return 3;
        }

        CGImageDestinationAddImage(dest, imageRef, nil);
        if (!CGImageDestinationFinalize(dest)) {
            NSLog(@"Error finalizing image destination");
            CFRelease(dest);
            CGImageRelease(imageRef);
            return 4;
        }

        CFRelease(dest);
        CGImageRelease(imageRef);
        NSLog(@"Successfully extracted frame at %.2fs to %@", CMTimeGetSeconds(actualTime), outPath);
    }
    return 0;
}
