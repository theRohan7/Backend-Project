const asyncHandler = (funct) => async(req, res, next) =>{
    try {
        await funct(req, res, next)
    } catch (error) {
        res.status(error.code || 500).json({
            success: false,
            message:  error.message
        })
    }

}

export {asyncHandler}



// IN PROMISE FORMAT

/*
const asyncHandler = (func) => {
    (req, res, next) => {
        promise.resolve(func(req, res, next))
        .catch((error) => next(error))
        }
    
}





*/